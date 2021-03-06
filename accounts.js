var db = require('./db'),
    util = require('./util'),
    async = require('async'),
    ee = require("./events-emitter").event,
    _ = require('underscore'),
    https = require('https'),
    Bitcoin = require('bitcoinjs-lib'),
    constants = require('./constants'),
    invitations = require('./invitations'),
    tnx = require('./tnx'),
    config = require('./config');
var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;

var twilioAccountSid = 'AC30c73160e3db54a9b64ae8f797019812',
    twilioAuthToken = 'f53a8da18397bd7419c2713cb7095919',
    twilioNumber = '+13212340543',
    twilio = require('twilio')(twilioAccountSid, twilioAuthToken);

var m = module.exports = {};
// Consume outstanting Facebook requests when creating an account

var consumeFBInvites = function (reqs, to, cb) {
    async.map(reqs, function (req, cb2) {
        db.FBInvite.remove({
            reqid: req.reqid
        }, eh(cb2, function () {
            db.User.findOne({
                id: req.from
            }, cb2);
        }));
    }, eh(cb, function (users) {
        console.log('consuming invites from', users, 'to', to.fbUser ? to.fbUser.first_name : "undefined");
        // Uniquefy users
        var umap = {};
        users.map(function (u) {
            if (u) {
                umap[u.id] = u;
            }
        });
        users = [];
        for (var uid in umap) {
            users.push(umap[uid]);
        }
        // Distribute thanx
        var reward = Math.floor(constants.Rewards.signupReward / users.length);
        async.map(users, function (user, cb2) {
            // Give to each inviting user
            console.log('giving to', user.fbUser.first_name, 'from', user.tnx, 'to', reward);

            var newCounter = (user.acceptedInviteCounter || 0) + (1 / users.length),
            //  newTnx = (user.tnx || 0) + reward;
                newTnx = reward;

            while (newCounter >= 10) {
                newCounter -= 10;
                newTnx += constants.Rewards.signupReward;
            }


            db.User.update({
                id: user.id
            }, {
                $set: {
                    acceptedInviteCounter: newCounter,
                    friends: user.friends.concat([to.id])
                },
                $inc: {
                    tnx: (newTnx) || 0
                }
            }, eh(cb2, function () {

                db.User.findOne({
                    id: user.id
                }, function (err, user) {
                    ee.emit('rawSend', [
                        {id: user.id, amount: user.tnx}
                    ]);
                });



                tnx.makeGiveRequest(user, to.id, 0, 1, "hey, here's one thanx from me for signing up :)", null, null);

                var Request = {
                    recipient: dumpUser(user),
                    sender: config.superUser,
                    id: util.randomHex(32),
                    message: to.fbUser.first_name + ' ' + to.fbUser.last_name + " signed up!",
                    // tnx: newTnx - user.tnx,
                    tnx: newTnx,
                    timestamp: new Date().getTime() / 1000,
                    requestType: "buySat",
                    txType: "signupReward"
                };

                db.Request.insert(Request);

                ee.emit("newRequest", user.id, Request);

                //tnx.makeGiveRequest(profile, recipientId, 0, 1, "initing fee", null, req.facebook);

                db.Transaction.insert({
                    payer: [to.id],
                    payee: dumpUser(user),
                    id: util.randomHex(32),
                    //tnx: newTnx - user.tnx,
                    tnx: newTnx,
                    txType: "signupReward",
                    timestamp: new Date().getTime() / 1000,
                    message: to.fbUser.first_name + ' ' + to.fbUser.last_name + " signed up!"
                }, cb2);


            }));
        }, eh(cb, function () {
            // Clear all users with more than 10 in their counter score
            // Give to receiving user
            var userIds = users.map(function (u) {
                    return u.id;
                }),
            //initialTnx = constants.Rewards.signupReward + reqs.length * constants.Rewards.inviteReward;
                initialTnx = constants.Rewards.signupReward;
            db.User.update({
                id: to.id
            }, {
                $set: {
                    tnx: initialTnx,
                    friends: userIds
                }
            }, eh(cb, function () {

                db.Request.insert({
                    recipient: dumpUser(to),
                    sender: config.superUser,
                    id: util.randomHex(32),
                    message: "a welcome gift",
                    tnx: initialTnx,
                    timestamp: new Date().getTime() / 1000,
                    requestType: "buySat",
                    txType: "signupReward"
                });

                db.Transaction.insert({
                    payer: userIds,
                    payee: dumpUser(to),
                    id: util.randomHex(32),
                    tnx: initialTnx,
                    message: "a welcome gift",
                    txType: "signupReward",
                    timestamp: new Date().getTime() / 1000
                }, cb);

            }));

        }));
    }));
};

m.innerRegister = function innerRegister(profile, req, res, finalCB) {
    var scope = {},
        newuser,
        newUsername = req ? req.param('name') : profile.name.replace(" ", "").toLowerCase() + '.thanx.io';

    // console.log("newUsername ", newUsername);
    async.series([

        function (cb) {
            db.FBInvite.find({
                to: profile.id
            }).toArray(setter(scope, 'reqs', cb));
        },
        function (cb) {


            //invitations.isLimitActive() &&
            if ((invitations.isLimitActive()) && (!scope.reqs || scope.reqs.length === 0)) {
                cb('currently only invited users can register');
            } else {
                cb();
            }
        },
        function (cb) {
            db.User.findOne({
                username: newUsername
            }, setter(scope, 'user', cb));
        },
        function (cb) {

            if (scope.user) {

                return cb('Account already exists', 400);
            }
            if (!/^[a-zA-Z][0-9a-zA-Z_-]{3,15}.thanx.io$/.test(newUsername)) {
                // return cb('illegal username');
            }
            console.log('registering');
            newuser = {
                username: newUsername,
                fbUser: profile,
                id: profile.id,
                inviteCounter: 0,
                tnx: 0,
                inviteAcceptedCounter: 0,
                seed: util.randomHex(40),
                verificationSeed: util.randomHex(20),
                friends: [],
                createdAt: new Date().getTime() / 1000,
                firstUse: true,
                changeable: true
            };


            db.User.insert(newuser, mkrespcb(res, 400, function () {
                console.log('requests found', scope.reqs);

                var msg = "hi " + newuser.fbUser.first_name + ", welcome to thanx.io :) <br><br>" +
                    "thanx.io is the first bitcoin messenger. it allows you to send bitcoin as easily as sending a facebook message. <br><br>" +
                    'click the “me” icon on the top left of the main screen to see important information such as your bitcoin address, and to turn satoshi into thanx and back.<br><br>' +
                    'thanx are equal to satoshi, but they do not require transactions fees. satoshi are 1/10000000 of a bitcoin, and live on the bitcoin blockchain. <br><br>' +
                    'you can tap the connect icon on the top right of the main conversations screen to start a new chat with a facebook friend, a thanx.io user, or an bitcoin address. You can type a name, or paste or QR a bitcoin address.<br><br>' +
                    'in a chat window, you can send messages, thanx, or satoshi, as well as request thanx or satoshi.<br><br>' +
                    'If your friends are not signed up, you can invite them, and when they sign up, both you, and they,  will get 12,345 thanx each. So invite all your friends :)';


                var Request = {
                    recipient: dumpUser(newuser),
                    sender: config.superUser,//dumpUser("123456thanx"),
                    id: util.randomHex(32),
                    message: msg,
                    timestamp: new Date().getTime() / 1000,
                    "isPending": false,
                    "cancelled": true,
                    "requestType": "GIVE"
                };


                db.Request.insert(Request, function () {
                    ee.emit("newRequest", null, Request);
                });

                consumeFBInvites(scope.reqs, newuser, cb);
            }));


        },
        function (cb) {

            var cId = req ? req.session.couponId : null;
            if (!cId) {
                cb();
                return;
            }


            db.Coupons.findOne({
                id: cId
            }, function (err, coupon) {
                console.log("coupon", coupon);
                if (coupon) {

                    if (coupon.counter > 5 || coupon.consumedArr.indexOf(newuser.id) > -1) {

                        cb();
                        return;
                    }

                    db.Coupons.update({id: cId},
                        {
                            $set: {
                                isConsumed: true,
                                consumedDate: new Date().getTime() / 1000,
                                consumedBy: newuser.id

                            },
                            $inc: { counter: 1 },
                            $push: {
                                "consumedArr": newuser.id
                            }
                        });


                    db.User.update({
                        id: newuser.id
                    }, {
                        $inc: {
                            tnx: (coupon.units) || 0
                        }
                    });

                    db.Request.insert({
                        recipient: dumpUser(newuser),
                        sender: config.superUser,//dumpUser("123456thanx"),
                        id: util.randomHex(32),
                        message: "coupon consume",
                        tnx: coupon.units,
                        timestamp: new Date().getTime() / 1000,
                        requestType: "buySat"
                    }, cb);

                } else {
                    cb();
                }

            });
        }
    ], finalCB);
};
// Register a new account


m.register = FBify(function (profile, req, res) {
    m.innerRegister(profile, req, res, mkrespcb(res, 400, function () {
        console.log('registered');
        res.json('success');
    }));
});

m.getUsersListByAddress = FBify(function (profile, req, res) {

    var keyword = req.param('keyword');
    /// console.log('keyword ', keyword);

    db.User.findOne({"address": keyword }, function (err, user) {

        /// console.log('res ', user);
        //;console.log('err ', err);

        if (!err && user) {
            res.json({
                uid: user.fbUser.id,
                name: user.fbUser.name
            });
        } else {
            res.json(null);
        }


    });


});

m.getBitconnectUsersByKey = FBify(function (profile, req, res) {

    var keyword = req.param('keyword');


    var usersArr = [];

    db.User.find({"fbUser.name": new RegExp("\\b(" + keyword + ")", "gi")}).toArray(function (err, arr) {

        if (!err && arr) {
            for (var x = 0; x < arr.length; x++) {
                var item = arr[x];

                usersArr.push({
                    uid: item.fbUser.id,
                    name: item.fbUser.name
                })
            }

        }

        res.json(usersArr);

    });


});

function getVerificationFqlQuery(profileId, invitedFriendIds) {
    var res = 'SELECT recipient_uid FROM apprequest WHERE app_id=' + config.FBappId + ' AND sender_uid=' + profileId + ' AND (',
        firstFriend = true;

    invitedFriendIds.forEach(function (friendId) {
        if (!firstFriend) {
            res += ' OR ';
        } else {
            firstFriend = false;
        }
        res += ' recipient_uid = ' + friendId;
    });
    res += ")";
    return res;
}

m.mkInvite = function (req, res) {

    console.log("mkInvite");

    req.facebook.api('/me', mkrespcb(res, 400, function (profile) {
        req.facebook.api({
            method: 'fql.query',
            query: getVerificationFqlQuery(profile.id, req.param('to'))
        }, function (err, verifiedInvitations) {
            var verifiedUnique = [],
                orCondition = [],
                alreadyExists = {};
            // find if some of the invitations already exist:
            verifiedInvitations.forEach(function (verifiedInvitations) {
                orCondition.push({
                    from: profile.id,
                    to: verifiedInvitations.recipient_uid
                });
            });
            db.FBInvite.find({
                $or: orCondition
            }).toArray(mkrespcb(res, 400, function (existingInvitations) {
                existingInvitations.forEach(function (existingInvitation) {
                    alreadyExists[existingInvitation.to] = true;
                });
                // add only invitations that do not exist, and remove duplicates:
                verifiedInvitations.forEach(function (invitation) {
                    if (alreadyExists[invitation.recipient_uid]) {
                        return;
                    }
                    verifiedUnique.push(invitation.recipient_uid);
                    alreadyExists[invitation.recipient_uid] = true;
                });
                if (invitations.isLimitActive()) {
                    // this means we are currently limiting the amount of allowed invitations,
                    // verify it and decrement accordingly
                    invitations.verifyAndDecrement(verifiedUnique.length, function (success) {
                        if (success) {
                            addInvitiations();
                        } else {
                            res.json('not enough global invitations, invitations not registered', 400);
                        }
                    });
                    return;
                } else {
                    // not limiting invitations:


                    addInvitiations();
                }
            }));


            function addInvitiations() {

                var invitationsToAdd = [];
                verifiedUnique.forEach(function (recipientId) {


                    invitationsToAdd.push({
                        from: profile.id,
                        to: recipientId,
                        timestamp: new Date().getTime() / 1000,
                        reqid: req.param('reqid')
                    });
                });

                db.FBInvite.insert(invitationsToAdd, mkrespcb(res, 400, function () {


                    res.json({
                        success: true
                    });


                }));
            }
        });
    }));
};

m.acceptInvite = function (req, res) {
    console.log('accessing from facebook');
    req.facebook.api('/me', mkrespcb(res, 400, function (profile) {
        var reqidStr = req.param('request_ids');
        var reqids = reqidStr ? reqidStr.split(',') : [];
        var query = {
            reqid: {
                $in: reqids
            },
            to: profile.id
        };
        db.FBInvite.update(query, {
            $set: {
                accepted: true
            }
        }, mkrespcb(res, 400, function () {
            async.map(reqids, function (reqid, cb) {
                var full_reqid = reqid + '_' + profile.id;
                req.facebook.api('/' + full_reqid, 'delete', function (e, r) {
                    cb(null, e || r);
                });
            }, mkrespcb(res, 400, function (results) {
                console.log('updated requests', results);
                res.render('welcome.jade', {});
            }));
        }));
    }));
};

m.kill = FBify(function (profile, req, res) {
    console.log('killing');
    db.User.findOne({
        id: profile.id
    }, mkrespcb(res, 400, function (u) {
        if (!u) return res.json("User not found", 400);
        db.User.remove({
            id: profile.id
        }, mkrespcb(res, 400, function () {
            db.User.find({}).toArray(mkrespcb(res, 400, function (users) {
                async.map(users, function (u, cb) {
                    db.User.update({
                        id: u.id
                    }, {
                        $set: {
                            friends: (u.friends || []).filter(function (i) {
                                return i != profile.id;
                            })
                        }
                    }, mkrespcb(res, 400, function () {
                        db.FBInvite.remove({
                            $or: [
                                {
                                    from: u.id
                                },
                                {
                                    to: u.id
                                }
                            ]
                        }, cb);
                    }));
                }, mkrespcb(res, 400, function () {
                    res.json({
                        username: null,
                        fbUser: profile
                    });
                }));
            }));
        }));
    }));
});

// Me

m.getMe = FBify(function (profile, req, res) {
    // console.log("getMe profile", profile);
    db.User.findOne({
        id: profile.id
    }, mkrespcb(res, 400, function (u) {

        console.log("getMe user ", u);
        if (u) {
            u.verification = undefined;
            u.phoneNumber = undefined;
            res.json(u);
        } else {

            if (!profile && profile.id) {
                return;
            }

            //console.log("profile", profile);


            m.innerRegister(profile, null, null, mkrespcb(res, 400, function () {
                db.User.findOne({
                    id: profile.id
                }, function (err, user) {

                    console.log("innerRegister err", err);
                    console.log("innerRegister user", user);

                    res.json(user);

                });
            }));


        }
    }));
});


// Get friendlist
/*
 m.getFriends = FBify(function(profile, req, res) {
 var scope = {};
 async.series([

 function(cb2) {
 req.facebook.api('/me/friends', {
 fields: 'id, first_name, last_name, picture'
 }, setter(scope, 'response', cb2));
 },
 function(cb2) {
 db.User.find({}).toArray(setter(scope, 'users', cb2));
 },
 function(cb2) {
 db.User.findOne({
 id: profile.id
 }, setter(scope, 'me', cb2));
 },
 function(cb2) {
 if (!scope.me) return res.json('me not found', 400);
 var fbFriends = scope.response.data;
 var friends = {
 registeredFriends: [],
 otherFriends: []
 };
 var usermap = {};
 scope.users.map(function(u) {
 usermap[u.id] = u;
 });
 var friendmap = {};
 fbFriends.map(function(f) {
 friendmap[f.id] = f;
 });
 fbFriends.map(function(f) {
 if (usermap[f.id]) {
 f.isUser = true;
 f.username = usermap[f.id].username;
 friends.registeredFriends.push(f);
 } else {
 friends.otherFriends.push(f);
 }
 if (friendmap[f.id]) f.isFriend = true;
 });
 setter(scope, 'friends', cb2)(null, friends);
 }
 ], mkrespcb(res, 400, function() {
 res.json(scope.friends);
 }));
 });
 */

m.getFriends = FBify(function (profile, req, res) {
    var scope = {};
    async.series([

        function (cb2) {
            req.facebook.api('/me/friends', {
                fields: 'id, first_name, last_name, picture'
            }, setter(scope, 'response', cb2));
        },
        function (cb2) {
            db.User.find({}).toArray(setter(scope, 'users', cb2));
        },
        function (cb2) {
            db.User.findOne({
                id: profile.id
            }, setter(scope, 'me', cb2));
        },
        function (cb2) {
            if (!scope.me) return res.json('me not found', 400);
            var fbFriends = scope.response.data;
            var friends = {
                registeredFriends: [],
                otherFriends: []
            };
            var usermap = {};
            scope.users.map(function (u) {
                usermap[u.id] = u;
            });
            var friendmap = {};
            fbFriends.map(function (f) {
                friendmap[f.id] = f;
            });
            fbFriends.map(function (f) {
                if (usermap[f.id]) {
                    f.isUser = true;
                    f.username = usermap[f.id].username;
                    friends.registeredFriends.push(f);
                } else {
                    friends.otherFriends.push(f);
                }
                if (friendmap[f.id]) f.isFriend = true;
            });
            setter(scope, 'friends', cb2)(null, friends);
        }

    ], mkrespcb(res, 400, function () {
        res.json(scope.friends);
    }));
});

// Autocomplete usernames

m.autoFill = function (req, res) {
    var partial = req.param('partial') || '';
    var names = partial.split(' ');
    var nameConditions = [
        {
            'fbUser.first_name': {
                $regex: '^' + names[0],
                $options: 'i'
            }
        }
    ];
    if (names[1]) {
        nameConditions.push({
            'fbUser.last_name': {
                $regex: '^' + names[1],
                $options: 'i'
            }
        });
    }
    db.User.find({
        $or: [
            {
                username: {
                    $regex: '^' + partial,
                    $options: 'i'
                }
            },
            {
                $and: nameConditions
            }
        ]
    })
        .toArray(mkrespcb(res, 400, function (r) {
            res.json(r.map(function (x) {
                return {
                    username: x.username,
                    id: x.id,
                    fullname: x.fbUser.first_name + " " + x.fbUser.last_name
                };
            }));
        }));
};

m.getUserById = function getUserById(req, res) {
    var userId = req.query.userId,
        username = req.query.username,
        btcAddress = req.query.btc,
        condition;

    console.log("username ", username);
    console.log("userId ", userId);


    if (userId) {
        condition = {
            id: userId
        };
    } else if (username) {
        condition = {
            username: username
        };
    } else if (btcAddress) {
        return res.json({
            id: btcAddress,
            isAddress: true,
            fullname: "user address"
        });
    } else {
        return res.json('user not found', 400);
    }

    db.User.findOne(condition, mkrespcb(res, 400, function (u) {
        console.log("u", u);
        if (!u || !u.fbUser) {

            req.facebook.api('/' + userId, 'GET', function (e, data) {
                //  console.log("e", e);
                //console.log("data", data);

                if (!e) {
                    return res.json({
                        id: data.id,
                        fullname: data.name
                    });
                } else {
                    res.json({
                        username: u.username,
                        id: u.id,
                        address: u.address
                    });
                }

            });


        } else {
            res.json({
                username: u.username,
                id: u.id,
                fullname: u.fbUser.first_name + " " + u.fbUser.last_name,
                first_name: u.fbUser.first_name,
                location: u.fbUser.location ? u.fbUser.location.name : "tel aviv, israel",
                address: u.address
            });
        }


    }));
};

// Is a username available?

m.checkName = function (req, res) {
    db.User.findOne({
        username: req.param('name')
    }, mkrespcb(res, 400, function (u) {
        if (!u) res.json('available');
        else res.json('used');
    }));
};

m.getPic = function (req, res) {
    function getPicture(userId) {
        req.facebook.api('/' + userId + '/picture?width=' + sz + '&height=' + sz + '&redirect=false', mkrespcb(res, 400, function (pic) {
            var extension = pic.data.url.slice(pic.data.url.length - 3);
            return res.redirect(pic.data.url);
        }));
    }

    var username = req.param('username'),
        userId = username && undefined || req.param('id'),
        sz = parseInt(req.param('size')) || 50;
    if (username) {
        db.User.findOne({
            username: username
        }, mkrespcb(res, 400, function (u) {
            if (!u) {
                return res.json("user not found", 404);
            }
            return getPicture(u.id);
        }));
    } else if (userId) {
        return getPicture(userId);
    }
};

// Return verification table

m.printVerificationTable = function (req, res) {
    db.User.find().toArray(mkrespcb(res, 400, function (users) {
        var twoToThe128 = new Bitcoin.BigInteger.fromByteArrayUnsigned([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            counter = new Bitcoin.BigInteger('0');

        var usertable = users.map(function (u) {
            var vsBytes = Bitcoin.convert.hexToBytes(u.verificationSeed || '00000000000000000000'),
                offset = new Bitcoin.BigInteger.fromByteArrayUnsigned(vsBytes),
                key = new Bitcoin.BigInteger('' + u.tnx).multiply(twoToThe128).add(offset),
                pub = Bitcoin.convert.bytesToHex(new Bitcoin.Key(key).getPub());
            counter = counter.add(key);
            return {
                vsHash: Bitcoin.Crypto.SHA256(u.verificationSeed),
                pubkey: pub
            };
        });
        res.json({
            total: counter.toString(),
            users: usertable
        });
    }));
};

m.printMyVerificationSeed = FBify(function (profile, req, res) {
    db.User.findOne({
        id: profile.id
    }, mkrespcb(res, 400, function (u) {
        if (u) res.send(u.verificationSeed || '00000000000000000000');
        else res.json("No user found", 400);
    }));
});

m.sendVerificationSMS = FBify(function (profile, req, res) {

    var phoneNumber = req.param('phone'),
        code = Math.floor((Math.random() * 9999) + 1),
        scope = {};
    async.series([

            function (cb) {
                db.User.find({
                    phoneNumber: phoneNumber,
                    id: {
                        $nin: [profile.id]
                    }
                }).count(setter(scope, 'existingPhoneNumber', cb));
            },
            function (cb) {
                if (scope.existingUsers > 0) {
                    return cb('phone number already exists');
                }
                db.User.findAndModify({
                    id: profile.id,
                    verified: {
                        $nin: [true]
                    }
                }, null, {
                    $set: {
                        'verification': {
                            'code': code,
                            'attempts': 0
                        },
                        'phoneNumber': phoneNumber
                    }
                }, setter(scope, 'user', cb));
            },
            function (cb) {
                if (!scope.user) {
                    return cb('user not found');
                }
                twilio.messages.create({
                    to: phoneNumber,
                    from: twilioNumber,
                    body: 'Your thanx.io verification code: ' + code
                }, cb);
            }
        ],
        mkrespcb(res, 400, function (result) {
            res.json('success', 201);
        }));
});

m.verifyAccount = FBify(function (profile, req, res) {
    var code = req.param('code'),
        scope = {};
    async.series([

        function (cb) {
            db.User.findOne({
                id: profile.id
            }, setter(scope, 'user', cb));
        },
        function (cb) {
            if (scope.user.verified) {
                return cb('user already verified');
            } else if (!scope.user.verification) {
                return cb('user didn\'t request verification code yet');
            } else if (code != scope.user.verification.code) {

                if (scope.user.verification.attempts >= 3) {
                    db.User.update({
                        id: profile.id
                    }, {
                        $set: {
                            'verification': undefined
                        }
                    }, function () {
                        cb('too many failing attempts, please request another code');
                    });
                } else {
                    db.User.update({
                        id: profile.id
                    }, {
                        $inc: {
                            'verification.attempts': 1
                        }
                    }, function () {
                        cb('incorrect verification code');
                    });
                }
            } else {
                db.User.update({
                    id: profile.id
                }, {
                    $set: {
                        'verification': undefined,
                        'verified': true
                    }
                }, cb);
            }
        }
    ], mkrespcb(res, 400, function (result) {
        res.json({
            verified: true
        });
    }));
});

m.updateApnToken = FBify(function (profile, req, res) {
    var token = req.param('token');

    console.log("token ", token);

    async.series([
        function (cb) {

            db.User.update({
                id: profile.id
            }, {
                $set: {
                    'ApnToken': token
                }
            }, cb);

        }
    ], mkrespcb(res, 400, function (result) {
        res.json({
            verified: true
        });
    }));
});

m.updateGcmToken = FBify(function (profile, req, res) {
    var token = req.param('token');

    console.log("token ", token);

    async.series([
        function (cb) {

            db.User.update({
                id: profile.id
            }, {
                $set: {
                    'GcmToken': token
                }
            }, cb);

        }
    ], mkrespcb(res, 400, function (result) {
        res.json({
            verified: true
        });
    }));
});

m.changeUsername = FBify(function changeUsername(profile, req, res) {
    var newUsername = req.param('username'),
        scope = {};
    if (!/^[a-zA-Z][0-9a-zA-Z_-]{3,15}.thanx.io$/.test(newUsername)) {
        return res.json(400, 'illegal username');
    }
    async.series([

        function (cb) {
            db.User.findOne({
                username: newUsername
            }, setter(scope, 'user', cb));
        },
        function (cb) {
            if (scope.user) {
                return cb('username already exists');
            }
            db.User.findAndModify({
                'id': profile.id,
                'changeable': true
            }, null, {
                $set: {
                    'username': newUsername,
                    'changeable': false
                }
            }, function (err, user) {
                if (!user) {
                    cb('user not found');
                } else {
                    cb();
                }
            });
        }
    ], mkrespcb(res, 400, function () {
        res.json('success');
    }));
});