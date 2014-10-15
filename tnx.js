var db = require('./db'),
    util = require('./util'),
    async = require('async'),
    _ = require('underscore'),
    Push = require('./pushnotify'),

    ee = require("./events-emitter").event,
    conversations = require('./conversations'),
    FB = require('fb'),
    pubsub = require('./pubsub'),
    Bitcoin = require('bitcoinjs-lib'),
    constants = require('./constants');

var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;

var m = module.exports = {};
var helloblock = require('helloblock-js')({
    network: 'mainnet'
});

function makeMessage(profile, otherUserId, msg, res, fb) {
    var scope = {}, isUser = false;


    async.series([

        function (cb2) {
            db.User.findOne({
                id: profile.id
            }, setter(scope, 'user', cb2));
        },
        function (cb2) {
            if (!scope.user) return res.json('unauthorized', 403);
            db.User.findOne({
                $or: [
                    {
                        username: otherUserId
                    },
                    {
                        id: otherUserId
                    }
                ]
            }, setter(scope, 'otherUser', cb2));
        },
        function (cb2) {
            if (!scope.otherUser) {
                if (parseInt(otherUserId)) {
                    scope.otherUser = {
                        id: otherUserId
                    };
                } else {
                    return res.json('recipient not found', 400);
                }
            } else {
                isUser = true;
            }

            console.log("otherUser", scope.otherUser);

            var isSeenSender = true;
            var isSeenReceiver = scope.otherUser.currentChat && scope.otherUser.currentChat == profile.id ? true : false;

            scope.request = {
                requestType: constants.RequestTypes.GIVE,
                recipient: dumpUser(scope.otherUser),
                sender: dumpUser(scope.user),
                message: msg,
                isSeenSender: isSeenSender,
                isSeenReceiver: isSeenReceiver,
                isPending: false,
                id: util.randomHex(32),
                timestamp: new Date().getTime() / 1000,
                updateTimestamp: new Date().getTime() / 1000,
                cancelled: true
            };


            db.Request.insert(scope.request, cb2);

            ee.emit("newRequest", profile.id, scope.request);


        },
        function (cb2) {
            if (!isUser) {
                return cb2();
            }

            var msgCourser = db.Request.find({
                'sender.id': scope.user.id,
                'recipient.id': scope.otherUser.id
            }, {sort: {timestamp: -1}, limit: 2});


            //console.log("msgCourser", msgCourser);

            var msgs = msgCourser.toArray(function (err, msgArr) {

                //console.log("msgArr", msgArr);

                var msg = msgArr[1];
                var now = new Date().getTime();
                msg = profile.first_name + ' sent you a message: ' + scope.request.message;
                msg = msg.replace(/<br>/g, '\n');

                var apnToken = scope.otherUser.ApnToken;
                var gcmToken = scope.otherUser.GcmToken;

                Push.sendNotification(apnToken, gcmToken, {otherUserId: profile.id}, msg);

                if (msg && msg.timestamp && (now - msg.timestamp * 1000 > 3 * 60 * 1000 )) {

                    var token = fb.getApplicationAccessToken();


                    if (msg.length >= 180) {
                        msg = msg.substring(0, 180 - 4) + "...";
                    }


                    fb.api('/' + scope.otherUser.id + '/notifications', 'POST', {
                        access_token: token,
                        template: msg,
                        href: '?src=getRequest&userId=' + profile.id
                    }, cb2);
                } else {
                    cb2();
                }

            });


        }

    ], mkrespcb(res, 400, function () {
        res.json(scope.request);
    }));
}

function makeGetRequest(getterProfile, giver, sat, tnx, msg, res, fb) {
    console.log('making get request');
    var scope = {}, isUser = false;
    async.series([

        function (cb2) {
            db.User.findOne({
                id: getterProfile.id
            }, setter(scope, 'payee', cb2));
        },
        function (cb2) {
            if (!scope.payee) return res.json('unauthorized', 403);
            db.User.findOne({
                $or: [
                    {
                        username: giver
                    },
                    {
                        id: giver
                    }
                ]
            }, setter(scope, 'payer', cb2));
        },
        function (cb2) {

            if (!scope.payer) {

                fb.api('/' + giver, 'GET', function (e, data) {
                    //  console.log("e", e);
                    // console.log("data", data);

                    if (!e) {

                        scope.payer = {
                            id: data.id,
                            fbUser: {
                                first_name: data.first_name,
                                last_name: data.last_name
                            }
                        };

                        cb2();

                    } else {
                        return res.json('payer not found', 400);
                    }

                });


            } else {

                isUser = true;
                cb2();
            }


        },
        function (cb2) {

            var isSeenReceiver = scope.payee.currentChat && scope.payee.currentChat == giver.id ? true : false;

            scope.request = {
                requestType: constants.RequestTypes.GET,
                recipient: dumpUser(scope.payer),
                sender: dumpUser(scope.payee),
                sat: sat,
                tnx: tnx,
                isSeenReceiver: isSeenReceiver,
                isPending: true,
                message: msg,
                id: util.randomHex(32),
                timestamp: new Date().getTime() / 1000,
                updateTimestamp: new Date().getTime() / 1000
            };
            db.Request.insert(scope.request, cb2);

            ee.emit("newRequest", null, scope.request);


        },
        function (cb2) {
            if (!isUser) {
                return cb2();
            }

            var token = fb.getApplicationAccessToken(),
                amount = tnx > 0 ? tnx + " thanx" : sat + " satoshi",
                name = getterProfile.first_name ? getterProfile.first_name : getterProfile.username,
                msg = name + ' has requested to receive ' + amount + ' from you. Click to accept it. message:' + scope.request.message;

            msg = msg.replace(/<br>/g, '\n');

            if (msg.length >= 180) {
                msg = msg.substring(0, 180 - 4) + "...";
            }

            var apnToken = scope.payer.ApnToken;
            var gcmToken = scope.payer.GcmToken;

            Push.sendNotification(apnToken, gcmToken, {otherUserId: getterProfile.id}, msg);

            fb.api('/' + scope.payer.id + '/notifications', 'POST', {
                access_token: token,
                template: msg,
                href: '?src=getRequest&userId=' + getterProfile.id + '&reqId=' + scope.request.id
            }, cb2);
        }
    ], mkrespcb(res, 400, function () {
        res.json(scope.request);
    }));
}

function makeGiveRequest(giverProfile, getter, sat, tnx, msg, res, fb) {
    console.log('making give request');
    console.log('getter', getter);


    var scope = {}, isUser = false;
    async.series([
        function (cb2) {
            db.User.findOne({
                id: giverProfile.id
            }, setter(scope, 'payer', cb2));
        },
        function (cb2) {
            if (!scope.payer) return res ? res.json('unauthorized', 403) : null;
            db.User.findOne({
                $or: [
                    {
                        username: getter
                    },
                    {
                        id: getter
                    }
                ]
            }, setter(scope, 'payee', cb2));
        },
        function (cb2) {

            if (!scope.payee) {

                fb.api('/' + getter, 'GET', function (e, data) {
                    //  console.log("e", e);
                    console.log("data", data);

                    if (!e) {

                        scope.payee = {
                            id: data.id,
                            fbUser: {
                                first_name: data.first_name,
                                last_name: data.last_name
                            }
                        };

                        cb2();

                    } else {
                        return res ? res.json('payee not found', 400) : null;
                    }

                });


            } else {

                isUser = true;
                cb2();
            }


        },
        function (cb2) {

            var isSeenReceiver = scope.payee.currentChat && scope.payee.currentChat == giverProfile.id ? true : false;

            scope.request = {
                requestType: constants.RequestTypes.GIVE,
                sender: dumpUser(scope.payer),
                recipient: dumpUser(scope.payee),
                sat: sat,
                isPending: true,
                isSeenReceiver: isSeenReceiver,
                tnx: tnx,
                message: msg,
                id: util.randomHex(32),
                timestamp: new Date().getTime() / 1000,
                updateTimestamp: new Date().getTime() / 1000
            };

            db.Request.insert(scope.request, cb2);

            ee.emit("newRequest", null, scope.request);

        },
        function (cb2) {
            if (!isUser) {

                return cb2();
            }


            var token = "761433597207088|4XR7js13e1eWVC--EH9OdD519dE", //fb.getApplicationAccessToken(),
                amount = tnx > 0 ? tnx + " thanx" : sat + " satoshi",
                name = giverProfile.first_name ? giverProfile.first_name : giverProfile.username,
                msg = name + ' wants to send you ' + amount + '. Click to accept it. message:' + scope.request.message;


            // console.log('name', name);
            // console.log('giverProfile', giverProfile);

            msg = msg.replace(/<br>/g, '\n');

            if (msg.length >= 180) {
                msg = msg.substring(0, 180 - 4) + "...";
            }

            var apnToken = scope.payee.ApnToken;
            var gcmToken = scope.payee.GcmToken;

            Push.sendNotification(apnToken, gcmToken, {otherUserId: giverProfile.id}, msg);


            //console.log('making give request', giverProfile);

            FB.api('/' + scope.payee.id + '/notifications', 'POST', {
                access_token: token,
                template: msg,
                href: '?src=giveRequest&userId=' + giverProfile.id + '&reqId=' + scope.request.id
            }, function () {

            });

            cb2();


        }
    ], mkrespcb(res, 400, function () {
        res ? res.json(scope.request) : null;
    }));
}


// Make an request
m.makeGiveRequest = makeGiveRequest;

m.mkRequest = FBify(function (profile, req, res) {
    console.log("mkRequest", profile);
    var sat = parseInt(req.param('sat')) || Math.ceil(parseFloat(req.param('btc')) * 100000000) || 0,
        tnx = parseInt(req.param('tnx')) || 0,
        msg = req.param('message') || '',
        tx = req.param('tx') || null,
        secondTx = req.param('secondTx') || null,
        requestType = req.param('requestType'),
        fb = req.facebook;

    console.log("mkRequest params", req.params);
    console.log("mkRequest sat", sat);
    console.log("mkRequest tnx", tnx);
    console.log("mkRequest msg", msg);
    console.log("mkRequest requestType", requestType);


    if (secondTx) {

        console.log('secondTx', secondTx);
        var to = req.param('to');
        return makeTwoWayRequest(profile, to, sat, tnx, msg, tx, secondTx, res, fb);
    } else if (!tnx && !sat) {
        makeMessage(profile, req.param('giveTo') || req.param('getFrom'), msg, res, fb)
    } else if (requestType === constants.RequestTypes.GET) {
        var from = req.param('getFrom');
        return makeGetRequest(profile, from, sat, tnx, msg, res, fb);
    } else if (requestType === constants.RequestTypes.GIVE) {
        var to = req.param('giveTo');
        return makeGiveRequest(profile, to, sat, tnx, msg, res, fb);
    } else {
        return res.json('unknown or non existent request type: ' + requestType, 400);
    }
});

// Refuse an request

m.clearRequest = FBify(function (profile, req, res) {


    var cb = mkrespcb(res, 400, function () {
        res.json('gone');
    });

    var q = {
        id: req.body.request_id,
        $or: [
            {
                'sender.id': profile.id
            },
            {
                'recipient.id': profile.id
            }
        ]
    };

    var sort = {};

    var doc = {$set: {
        isPending: false,
        deleteTimestamp: new Date().getTime() / 1000,
        updateTimestamp: new Date().getTime() / 1000
    }};

    var options = {new: true};

    var cbF = mkrespcb(res, 400, function (requestObj) {


        if (!requestObj) {
            res.json('request not found', 404);
            return;
        }

        console.log("m.clearRequest occured", requestObj);

        if (requestObj.sender.id === profile.id) {
            db.Request.update({id: requestObj.id}, {$set: {cancelled: true}});
            requestObj.cancelled = true;
            ee.emit("updateRequest", null, requestObj);
            res.json(requestObj);
            return;
        }


        db.Request.update({id: requestObj.id}, {$set: {rejected: true}});

        // notify request sender:
        var token = req.facebook.getApplicationAccessToken(),
            amount = requestObj.sat > 0 ? requestObj.sat + " satoshi" : requestObj.tnx + " thanx",
            reqType = requestObj.requestType === constants.RequestTypes.GET ? 'get' : 'give',

            msg;

        if (reqType === 'get') {
            msg = profile.first_name + ' didn\'t accept your request to send ' + amount + '.';
        } else {
            msg = profile.first_name + ' didn\'t accept the ' + amount + ' you sent.';
        }

        db.User.findOne({
            $or: [
                {
                    id: requestObj.sender.id
                }
            ]
        }, function (err, user) {
            if (err || !user)
                return;

            var apnToken = user.ApnToken;
            var gcmToken = user.GcmToken;
            Push.sendNotification(apnToken, gcmToken, {}, msg);
        });


        req.facebook.api('/' + requestObj.sender.id + '/notifications', 'POST', {
            access_token: token,
            template: msg,
            href: '?src=rejectRequest&userId' + profile.id
        }, function () {
        });

        requestObj.cancelled = true;


        ee.emit("updateRequest", null, requestObj);


        res.json(requestObj);

    });

    db.Request.findAndModify(q, sort, doc, options, cbF);


});

// Payment requests

m.getPendingRequests = FBify(function (profile, req, res) {
    db.Request.find({
        $or: [
            {
                'recipient.id': 'profile.id'
            },
            {
                'sender.id': profile.id
            }
        ]
    })
        .sort({
            timestamp: -1
        })
        .toArray(mkrespcb(res, 400, function (result) {
            var finalResult = {
                incoming: {
                    get: [],
                    give: []
                },
                outgoing: {
                    get: [],
                    give: []
                }
            };
            result.forEach(function (request) {
                var direction, type;
                if (request.sender.id === profile.id) {
                    direction = 'outgoing';
                } else if (request.recipient.id === profile.id) {
                    direction = 'incoming';
                }
                if (request.requestType === constants.RequestTypes.GET) {
                    type = 'get';
                } else if (request.requestType === constants.RequestTypes.GIVE) {
                    type = 'give';
                }
                if (direction && type) {
                    finalResult[direction][type].push(request);
                }
            });
            res.json(finalResult, 200);
        }));
});

// Send thanx (raw function) - accepts mongodb queries for from and to arguments

m.rawsend = function (fromquery, toquery, tnx, txType, cb, message, request) {

    //  console.log("start rawsend id : ", request);
    if (!parseInt(tnx)) return cb('invalid tnx count');
    if (tnx < 0) return cb('you can\'t send a negative amount');
    var scope = {};
    async.series([

        function (cb2) {
            db.User.findOne(fromquery, setter(scope, 'from', cb2));
        },
        function (cb2) {
            if (!scope.from) return cb('user not found');
            scope.from.tnx = parseInt(scope.from.tnx);
            if (scope.from.tnx < tnx) return cb('sender too poor');
            db.User.findOne(toquery, setter(scope, 'to', cb2));
        },
        function (cb2) {
            if (!scope.to) return cb('user not found');
            db.User.update({
                id: scope.from.id
            }, {
                $set: {
                    tnx: scope.from.tnx - tnx
                }
            }, cb2);
        },
        function (cb2) {
            db.User.update({
                id: scope.to.id
            }, {
                $set: {
                    tnx: (scope.to.tnx || 0) + tnx
                }
            }, cb2);
        },
        function (cb2) {
            db.Transaction.insert({
                payer: dumpUser(scope.from),
                payee: dumpUser(scope.to),
                id: util.randomHex(32),
                tnx: tnx,
                txType: txType,
                message: message,
                timestamp: new Date().getTime() / 1000
            }, cb2);
        }
    ], eh(cb, function () {

        console.log("rawSend !!!!!!!!!!!!!!!!!!!!!!!!!");

        ee.emit('rawSend', [
            {id: scope.to.id, amount: (scope.to.tnx || 0) + tnx},
            {id: scope.from.id, amount: (scope.from.tnx || 0) - tnx}
        ]);

        cb(null, 'success');
    }));
};

// Send thanx


m.sendTNX = FBify(function (profile, req, res) {
    var to = req.param('to'),
        tnx = parseInt(req.param('tnx')) || 0,
        message = req.param('message'),
        request = req.param('request'),
        txType = req.param('txType'),
        scope = {};

    // console.log("sendTNX request id", request);
    scope.requestObj = {};

    // console.log(to, tnx, request, message, txType);
    async.series([

        function (cb2) {
            m.rawsend({
                    id: profile.id
                }, {
                    $or: [
                        {
                            id: to
                        },
                        {
                            username: to
                        }
                    ]
                },
                tnx,
                txType,
                cb2,
                message,
                request);
        },
        function (cb2) {


            var q = {id: request};
            var sort = {};
            var doc = {$set: {
                isPending: false,
                archiveTimestamp: new Date().getTime() / 1000,
                updateTimestamp: new Date().getTime() / 1000
            }};
            var options = {new: true};

            db.Request.findAndModify(q, sort, doc, options, function (err, requestObj) {
                //   console.log("sendTNX findAndModify err", err);
                //   console.log("sendTNX findAndModify requestObj", requestObj);

                scope.requestObj = requestObj;
                var token = req.facebook.getApplicationAccessToken(),
                    amount = tnx + " thanx",
                    msg = profile.first_name + ' sent you ' + amount + ' that you requested.';

                db.User.findOne({
                    $or: [
                        {
                            id: requestObj.sender.id
                        }
                    ]
                }, function (err, user) {
                    if (err || !user)
                        return;

                    var apnToken = user.ApnToken;
                    var gcmToken = user.GcmToken;
                    Push.sendNotification(apnToken, gcmToken, {}, msg);

                });


                req.facebook.api('/' + requestObj.sender.id + '/notifications', 'POST', {
                    access_token: token,
                    template: msg,
                    href: '?src=confirmGet&userId=' + profile.id
                }, cb2);

            });


        }
    ], mkrespcb(res, 400, function (x) {

        ee.emit("updateRequest", null, scope.requestObj);
        res.json(scope.requestObj);
    }));
});

m.acceptGive = FBify(function (profile, req, res) {
    var scope = {};
    async.series([

        function (cb) {
            db.Request.findOne({
                'id': req.param('requestId'),
                'isPending': true
            }, setter(scope, 'request', cb));
        },
        function (cb) {
            if (!scope.request || scope.request.recipient.id !== profile.id) {
                return res.json('no such request', 400);
            }
            db.User.findOne({
                id: scope.request.sender.id
            }, setter(scope, 'giver', cb));
        },
        function (cb) {
            if (!scope.giver) {
                return res.json('giver not found', 400);
            } else if (scope.giver.tnx < scope.request.tnx) {
                return res.json('giver has insufficient funds', 400);
            }
            db.User.update({
                id: scope.giver.id
            }, {
                $inc: {
                    tnx: -scope.request.tnx
                }
            }, cb);
        },
        function (cb) {
            db.User.update({
                id: profile.id
            }, {
                $inc: {
                    tnx: scope.request.tnx
                }
            }, cb);
        },
        function (cb) {
            db.Transaction.insert({
                payer: dumpUser(scope.giver),
                payee: dumpUser(scope.request.recipient),
                id: util.randomHex(32),
                tnx: scope.request.tnx,
                txType: constants.TxTypes.giveRequest,
                message: scope.request.message,
                requestTimestamp: scope.request.timestamp,
                timestamp: new Date().getTime() / 1000
            }, cb);
        },
        function (cb) {


            var q = {id: scope.request.id};
            var sort = {};
            var doc = {
                $set: {
                    isPending: false,
                    archiveTimestamp: new Date().getTime() / 1000,
                    updateTimestamp: new Date().getTime() / 1000
                }};

            var options = {new: true};

            db.Request.findAndModify(q, sort, doc, options, function (err, requestObj) {

                // console.log("acceptGive findAndModify err", err);
                //  console.log("acceptGive findAndModify requestObj", requestObj);


                scope.requestObj = requestObj;
                var token = req.facebook.getApplicationAccessToken(),
                    amount = scope.request.tnx + " thanx",
                    msg = profile.first_name + ' accepted the ' + amount + ' you sent.';


                db.User.findOne({
                    $or: [
                        {
                            id: requestObj.sender.id
                        }
                    ]
                }, function (err, user) {
                    if (err || !user)
                        return;

                    var apnToken = user.ApnToken;
                    var gcmToken = user.GcmToken;
                    Push.sendNotification(apnToken, gcmToken, {}, msg);

                });


                req.facebook.api('/' + requestObj.sender.id + '/notifications', 'POST', {
                    access_token: token,
                    template: msg,
                    href: '?src=confirmGive&userId=' + profile.id
                }, function () {

                });

                cb();

            });

        }
    ], mkrespcb(res, 200, function () {

        db.User.findOne({
            id: scope.request.sender.id
        }, function (err, user) {
            ee.emit('rawSend', [
                {id: user.id, amount: user.tnx}
            ]);
        });

        db.User.findOne({
            id: profile.id
        }, function (err, user) {
            ee.emit('rawSend', [
                {id: user.id, amount: user.tnx}
            ]);
        });


        ee.emit("updateRequest", null, scope.requestObj);

        res.json(scope.requestObj);
    }));
});

m.getHistory = FBify(function (profile, req, res) {
    db.Transaction.find({
        $or: [
            {
                'payer.id': profile.id
            },
            {
                'payee.id': profile.id
            }
        ]
    })
        .sort({
            timestamp: -1
        })
        .toArray(mkrespcb(res, 400, function (results) {
            db.RequestArchive.find({
                $and: [
                    {
                        $or: [
                            {
                                rejected: true
                            },
                            {
                                cancelled: true
                            }
                        ]
                    },
                    {
                        $or: [
                            {
                                'sender.id': profile.id
                            },
                            {
                                'recipient.id': profile.id
                            }
                        ]
                    }
                ]
            }).toArray(mkrespcb(res, 400, function (results2) {
                results2.forEach(function (request) {
                    var senderKey, recipientKey;
                    senderKey = request.requestType === constants.RequestTypes.GET ? 'payee' : 'payer';
                    recipientKey = request.requestType === constants.RequestTypes.GET ? 'payer' : 'payee';
                    request[senderKey] = request.sender;
                    request[recipientKey] = request.recipient;
                    request.sender = undefined;
                    request.recipient = undefined;
                });
                var history = results.concat(results2);
                history.sort(function compare(item1, item2) {
                    return -(item1.timestamp - item2.timestamp);
                });
                res.json(history);
            }));
        }));
});

m.getInteractionWithUser = FBify(function (profile, req, res) {
    var otherUserId = req.param('otherUserId'),
        scope = {};
    if (!otherUserId) {
        return res.json('missing user id', 400);
    }
    if (otherUserId === profile.id) {
        return res.json('cannot chat with yourself', 400);
    }
    async.series([

            function (cb) {
                db.User.findOne({
                    id: otherUserId
                }, setter(scope, 'user', cb));
            },
            function (cb) {
                if (!scope.user) {
                    return res.json('user not found', 400);
                }
                // get transactions:
                db.Transaction.find({
                    $or: [
                        {
                            'payer.id': profile.id,
                            'payee.id': otherUserId
                        },
                        {
                            'payee.id': profile.id,
                            'payer.id': otherUserId
                        }
                    ]
                })
                    .sort({
                        timestamp: -1
                    })
                    .toArray(setter(scope, 'transactions', cb));
            },
            function (cb) {
                // get archived requests:
                db.RequestArchive.find({
                    $and: [
                        {
                            $or: [
                                {
                                    rejected: true
                                },
                                {
                                    cancelled: true
                                }
                            ]
                        },
                        {
                            $or: [
                                {
                                    'sender.id': profile.id,
                                    'recipient.id': otherUserId
                                },
                                {
                                    'recipient.id': profile.id,
                                    'sender.id': otherUserId
                                }
                            ]
                        }
                    ]
                }).toArray(setter(scope, 'archive', cb));
            },
            function (cb) {
                // get pending requests:
                db.Request.find({
                    $or: [
                        {
                            'sender.id': profile.id,
                            'recipient.id': otherUserId
                        },
                        {
                            'recipient.id': profile.id,
                            'sender.id': otherUserId
                        }
                    ]
                }).toArray(setter(scope, 'requests', cb));
            }
        ],
        mkrespcb(res, 400, function () {
            scope.transactions.forEach(function (tx) {
                if (tx.txType === constants.TxTypes.getRequest) {
                    tx.sender = {
                        id: tx.payee.id
                    };
                } else if (tx.txType === constants.TxTypes.giveRequest) {
                    tx.sender = {
                        id: tx.payer.id
                    };
                }
            });
            var results = scope.archive.concat(scope.requests).concat(scope.transactions);
            results.sort(function compare(item1, item2) {
                return ((item1.requestTimestamp || item1.timestamp) - (item2.requestTimestamp || item2.timestamp));
            });
            res.json(results);
        }));
});

m.getLatestUserInteractions = FBify(function (profile, req, res) {
    var scope = {};

    function maxTimestamp(obj, prev) {
        if (obj.requestTimestamp || obj.timestamp > prev.timestamp) {
            prev.timestamp = obj.requestTimestamp || obj.timestamp;
            prev.obj = obj;
        }
    }


    async.series([

            function (cb) {
                // get transactions:
                db.Transaction.
                    group([
                        'payer.id',
                        'payee.id'
                    ], {
                        $or: [
                            {
                                'payer.id': profile.id
                            },
                            {
                                'payee.id': profile.id
                            }
                        ]
                    }, {
                        timestamp: 0
                    }, maxTimestamp, setter(scope, 'transactions', cb));
            },
            function (cb) {
                // get archived requests:
                db.RequestArchive.group(['sender.id', 'recipient.id'], {
                    $and: [
                        {
                            $or: [
                                {
                                    rejected: true
                                },
                                {
                                    cancelled: true
                                }
                            ]
                        },
                        {
                            $or: [
                                {
                                    'sender.id': profile.id
                                },
                                {
                                    'recipient.id': profile.id
                                }
                            ]
                        }
                    ]
                }, {
                    timestamp: 0
                }, maxTimestamp, setter(scope, 'archive', cb));
            },
            function (cb) {
                // get pending requests:
                db.Request.group(['sender.id', 'recipient.id'], {
                    $or: [
                        {
                            'sender.id': profile.id
                        },
                        {
                            'recipient.id': profile.id
                        }
                    ]
                }, {timestamp: 0}, maxTimestamp, setter(scope, 'requests', cb));
            }
        ],
        mkrespcb(res, 400, function () {
            var interactionsByOtherUser = {},
                otherUserId,
                results = [];

            function requestParser(requestAggrObj) {
                if (requestAggrObj.obj.sender.id == profile.id) {
                    requestAggrObj.obj.otherUserKey = 'recipient';
                }
                else {
                    requestAggrObj.obj.otherUserKey = 'sender';
                }
                otherUserId = requestAggrObj.obj[requestAggrObj.obj.otherUserKey].id;
                if (!interactionsByOtherUser[otherUserId] ||
                    interactionsByOtherUser[otherUserId].timestamp < requestAggrObj.timestamp) {
                    interactionsByOtherUser[otherUserId] = requestAggrObj;
                }
            }

            scope.transactions.forEach(function (txAggrObj) {
                if (!txAggrObj.obj.payee || !txAggrObj.obj.payer || !txAggrObj.obj.payee.id || !txAggrObj.obj.payer.id) {
                    return;
                }
                if (txAggrObj.obj.payee.id == profile.id) {
                    txAggrObj.obj.otherUserKey = 'payer';
                }
                else {
                    txAggrObj.obj.otherUserKey = 'payee';
                }
                otherUserId = txAggrObj.obj[txAggrObj.obj.otherUserKey].id;
                if (!interactionsByOtherUser[otherUserId] ||
                    interactionsByOtherUser[otherUserId].timestamp < txAggrObj.timestamp) {
                    interactionsByOtherUser[otherUserId] = txAggrObj;
                }
            });
            scope.requests.forEach(requestParser);
            scope.archive.forEach(requestParser);

            for (otherUserId in interactionsByOtherUser) {
                if (interactionsByOtherUser.hasOwnProperty(otherUserId)) {
                    results.push(interactionsByOtherUser[otherUserId].obj);
                }
            }
            results.sort(function (item1, item2) {
                return -((item1.requestTimestamp || item1.timestamp) - (item2.requestTimestamp || item2.timestamp));
            });


            // console.log("interactionsByOtherUser", interactionsByOtherUser);
            //  console.log("results", results);
            res.json(results);
        }));
});