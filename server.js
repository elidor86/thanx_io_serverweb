var

    db = require('./db'),
    util = require('./util'),
    coupons = require('./coupons'),
    express = require('express'),
    mongoStore = require('connect-mongo')(express),
    cp = require('child_process'),
    crypto = require('crypto'),
    async = require('async'),
    cors = require('cors'),
    http = require('http'),
    _ = require('underscore'),
    https = require('https'),
    fs = require('fs'),
    iosPush = require('./pushnotify'),
    pubsub = require('./pubsub'),
    Chat = require('./chat'),
    Facebook = require('facebook-node-sdk'),
    accounts = require('./accounts'),
    btc = require('./btc'),//
    conversations = require('./conversations'),
    tnx = require('./tnx'),
    config = require('./config'),
    invitations = require('./invitations'),
    FB = require('fb'),
    requirejs = require('requirejs');

console.log("process.env.Production", process.env.Production);
console.log("process.env.Production", process.env.production);


Facebook.registerRequired = function (config) {
    return function (req, res, next) {
        Facebook.loadRegisteredUser(config)(req, res, function () {
            if (!req.registeredUser) {
                res.redirect('/');
            } else {
                next();
            }
        });
    };
};


Facebook.loadRegisteredUser = function (config) {

    // console.log("loadRegisteredUser");

    return function (req, res, next) {

        // console.log("session ", req.session);
        // console.log("cookies ", req.cookies);

        if (!req.facebook) {
            Facebook.middleware(config)(req, res, afterNew);
        } else {
            afterNew();
        }

        function afterNew() {

            req.facebook.getUser(function (err, user) {

                if (!err && user) {
                    db.User.findOne({
                        id: user
                    }, function (err, u) {
                        req.registeredUser = u;
                        next();
                    });
                } else {
                    next();
                }
            });
        }
    };

};

Facebook.loginRequiredPhonegap = function (config) {

    return function (req, res, next) {


        if (!req.facebook) {
            Facebook.middleware(config)(req, res, afterNew);
        }
        else {
            afterNew();
        }

        function afterNew() {

            console.log("req.query", req.query);
            console.log("req.body", req.body);

            if (req.query && req.query.accessToken) {
                req.facebook.setAccessToken(req.query.accessToken);
            }
            else if (req.body && req.body.accessToken) {
                req.facebook.setAccessToken(req.body.accessToken);
            }


            req.facebook.getUser(function (err, user) {
                if (err) {
                    next(err);
                    next = null;
                }
                else {
                    if (user === 0) {
                        try {
                            var loginUrl = req.facebook.getLoginUrl(config)
                        }
                        catch (err) {
                            next(err);
                            next = null;
                            return;
                        }
                        res.redirect(loginUrl);
                        next = null;
                    }
                    else {
                        next();
                        next = null;
                    }
                }
            });
        }

    };
};


var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;


var app = express();

/*
 //TODO: use env for production
 //express defaults:  this.set('env', process.env.NODE_ENV || 'development');
 app.set("env", "production");
 app.configure("production", function(){

 });
 app.configure("development", function(){

 });
 */


app.configure(function () {
    app.set('views', __dirname + '/html_views');
    //app.set('view engine', 'jade');
    app.engine('html', require('ejs').renderFile);
    app.set('view options', {
        layout: false
    });

    // app.use(express['static'](__dirname + '/build'));
    app.use(express['static'](__dirname + '/public'));
    app.use(express['static'](__dirname + '/html_views'));
    //app.use(express.static('/home/bitcoin/public'));
    //app.use(express.static('/home/bitcoin/build'));
    app.use(express.bodyParser());
    app.use(cors());
    app.use(express.cookieParser('33thanxBTCchina'));


    if (process.env.Production) {
        app.use(express.session({
            secret: '314159265358979'
        }));
    } else {

        app.use(express.session({
            secret: '314159265358979',
            store: new mongoStore({
                url: "mongodb://elidor:smalltalk86@localhost:27017/bitconnect"
            })
        }));
    }


    app.use(Facebook.middleware({
        appId: config.FBappId,
        secret: config.FBsecret
    }));

    app.use(app.router);

});


console.log("server start");
//app.get('/', Facebook.isRegistered(), function(req,res) {                       
app.all('/', Facebook.loadRegisteredUser({}), function (req, res, next) {
    console.log("main .");
    //res.setHeader("Access-Control-Allow-Origin", "*");

    var parts = req.host.split('.'),
        profileId = parts.slice(0, 3).join('.');


    //console.log("url", req.url);
    /// console.log("query", req.query);


    if (parts.length <= 2) {

        if (req.registeredUser) {
            console.log("req.registeredUser", req.registeredUser);
            res.render('app.html');

        } else {
            res.render('welcome.html');
        }
    } else if (req.url.length <= 1) {


        db.User.findOne({
            username: profileId
        }, mkrespcb(res, 400, function (u) {
            if (!u) {
                //console.log("req.registeredUser", req.registeredUser);
                res.redirect('http://' + req.headers.host.split('.').slice(1, 3).join('.') + "/coupons/" + parts[0]);

            } else {
                res.render('profile-index.html', {userId: u.id });
                //res.redirect('http://' + req.headers.host.split('.').slice(1, 3).join('.') + req.url + 'profile/' + u.id);
            }
        }));
    }
});


app.get('/login', Facebook.loginRequiredPhonegap(), FBify(function (profile, req, res) {

    /*
     res.redirect=function(str){
     console.log("redirect",str);
     };*/

    db.User.findOne({
        id: profile.id
    }, mkrespcb(res, 400, function (u) {


        if (!u) {
            if (!username || !/^[a-zA-Z][0-9a-zA-Z_-]{3,50}$/.test(username)) {


                var username = profile.username ? profile.username.split('.').join('') : undefined,
                    altUsername = (profile.first_name + '_' + profile.last_name).split('.').join('').toLowerCase();


                if (!username || !/^[a-zA-Z][0-9a-zA-Z_-]{3,50}$/.test(username)) {
                    username = altUsername;
                    if (!username || !/^[a-zA-Z][0-9a-zA-Z_-]{3,50}$/.test(username)) {
                        res.redirect('/app/newaccount');
                        return;
                    }
                }

                req.params.name = username + '.thanx.io';

                accounts.innerRegister(profile, req, res, function (err) {
                    console.log(err);
                    if (err) {
                        res.redirect('/app/newaccount');
                        return;
                    } else {
                        res.redirect('/app/conversations');
                        return;
                    }
                });

            }
        } else if (req.param('goto')) {
            res.redirect(req.param('goto'));
            return;
        } else if (u.firstUse) {
            console.log('/app/conversations');
            res.redirect('/app/conversations');
            return;
        }
        else res.redirect('/app/give');
    }));
}));


app.all('/logout', Facebook.loginRequiredPhonegap(), FBify(function (profile, req, res) {
    //res.render('welcome.html', {});
    req.facebook.destroySession();
    res.redirect('/');
}));

// Show the app
app.get('/app/newaccount', Facebook.loadRegisteredUser(), FBify(function (profile, req, res) {
    if (invitations.isLimitActive()) {
        db.FBInvite.findOne({
            to: profile.id
        }, mkrespcb(res, 400, function (invite) {
            if (req.session.haveCoupon || invite) {

                if (req.registeredUser) {
                    res.redirect('/app/us');
                }
                res.render('newaccount.html');

            }
            else {

                res.render('welcome.html', {
                    tried: true
                });


            }
        }));
    } else {
        if (req.registeredUser) {
            res.redirect('/app/us');
        }
        res.render('newaccount.html');
    }
}));

app.get('/app/*', Facebook.registerRequired(), function (req, res) {

    //res.setHeader("Access-Control-Allow-Origin", "*");


    req.facebook.getUser(function (err, user) {

        console.log("e", user);
        console.log("req.session.accessToken", req.session.accessToken);

        var FBfriends = {};

        if (!err && user) {
            db.User.findOne({
                id: user
            }, function (err, u) {
                res.render('app.html', { profile: JSON.stringify(u) });
            });
        } else {
            next();
        }
    });


});

app.get('/profile/*', function (req, res) {
    res.render('profile-index.html');
});

app.get('/partials/newaccount', Facebook.loginRequiredPhonegap(), FBify(function (profile, req, res, next) {
    if (invitations.isLimitActive()) {
        db.FBInvite.findOne({
            to: profile.id
        }, mkrespcb(res, 400, function (invite) {
            res.render('partials/newaccount', {
                allow: invite ? true : false
            });
        }));
    } else {
        res.render('partials/newaccount', {
            allow: true
        });
    }
}));


/*
 app.get('/partials/:name', function (req, res) {
 res.render('partials/' + req.params.name);
 });*/

/*
 app.get('/partials/top/:name', function (req, res) {

 res.render('partials/top/' + req.params.name);
 });*/

/*
 app.get('/templates/:name', function (req, res) {
 res.render('templates/' + req.params.name);
 });*/

app.post('/canvas', Facebook.loadRegisteredUser({}), function (req, res) {
    var params = req.url.split("?")[1],
        newUrl = '/acceptinvite?' + params;

    var post = req.body;

    var signedRequestValue = post.signed_request;
    var appSecret = '483c2bafec24598467c82270bbde6dbc';

    //console.log("canvas req.session", req.session.user_id);

    var signedRequest = FB.parseSignedRequest(signedRequestValue, appSecret);
    if (signedRequest) {

        //console.log("signedRequest", signedRequest);
        var accessToken = signedRequest.oauth_token;
        var userId = signedRequest.user_id;
        var userCountry = signedRequest.user.country;

        if (userId) {
            //console.log("redirect to chat", userId);
            req.session.accessToken = accessToken;


            var otherUserId = req.param('userId');
            var reqId = req.param('reqId');
            // console.log("otherUserId", otherUserId);
            //console.log("otherUserId", reqId);
            if (otherUserId) {
                var q = reqId ? '?reqId=' + reqId : "";
                res.redirect('/app/chat/' + otherUserId + q);
            } else {
                res.redirect('/app/conversations/');
            }


            //res.render('index.html', {locals: {userId: userId}});
            //
        }
        else {
            res.redirect('/');
        }

    } else {
        res.redirect('/');
    }


});

var adminAuthentication = FBify(function (profile, req, res, next) {
    if (profile.id !== '1111507553' && profile.id !== '720023205' && profile.id !== '641665226') {
        return res.json('unauthorized', 403);
    } else {
        next();
    }
});

app.get('/admin*', Facebook.loginRequiredPhonegap(), adminAuthentication);
app.post('/admin*', Facebook.loginRequiredPhonegap(), adminAuthentication);

app.post('/admin/invitationlimit', invitations.updateInvitationLimit);

// Show a specific page

function showpage(path, template) {
    app.get(path, function (req, res) {
        res.render(template, {});
    });
}

showpage('/terms', 'terms.html');
showpage('/faq', 'faq.html');
showpage('/audit', 'audit.html');

// Direct database API query

function dump(path, collection) {
    var f = function (req, res) {
        db[collection].find(req.query).toArray(mkrespcb(res, 400, _.bind(res.json, res)));
    };
    app.get(path, f);
    app.post(path, f);
}

//These dumps are for testing only

//dump('/fbinvitedump', 'FBInvite');
//dump('/userdump', 'User');
//dump('/requestdump', 'Request');
//dump('/historydump', 'Transaction');

// All API routes

app.post('/sendbtc', Facebook.loginRequiredPhonegap(), btc.sendBTC);
app.get('/addressoutputs', btc.getAddressOutputs);
app.post('/addressoutputs', btc.getAddressOutputs);
app.get('/thanxaddress', btc.getThanxAddress);
app.get('/coupons/:cId', Facebook.loginRequiredPhonegap(), coupons.consumeCoupon);
app.post('/buytnx', Facebook.loginRequiredPhonegap(), btc.buyTNX);
app.post('/buysat', Facebook.loginRequiredPhonegap(), btc.buySat);

app.post('/submitaddress', Facebook.loginRequiredPhonegap(), btc.submitAddress);
app.get('/price', btc.price);
app.get('/fetchheight', btc.fetchHeight);

app.post('/mkrequest', Facebook.loginRequiredPhonegap(), tnx.mkRequest);
app.post('/clearrequest', Facebook.loginRequiredPhonegap(), tnx.clearRequest);
app.get('/pendingrequests', Facebook.loginRequiredPhonegap(), tnx.getPendingRequests);
app.post('/sendtnx', Facebook.loginRequiredPhonegap(), tnx.sendTNX);
app.post('/acceptgive', Facebook.loginRequiredPhonegap(), tnx.acceptGive);
//app.post('/accepttwoway', Facebook.loginRequiredPhonegap(), tnx.accepttwoway);

//app.get('/rawhistory', Facebook.loginRequiredPhonegap(), tnx.getHistory);

app.get('/interaction', Facebook.loginRequiredPhonegap(), tnx.getInteractionWithUser);
app.get('/latestinteractions', Facebook.loginRequiredPhonegap(), tnx.getLatestUserInteractions);


app.post('/getmyconversations', Facebook.loginRequiredPhonegap(), conversations.getMyConversations);
app.post('/getNextBatch', Facebook.loginRequiredPhonegap(), conversations.getNextBatch);

app.post('/subme', Facebook.loginRequiredPhonegap(), pubsub.subMe);


app.post('/setChatWith', Facebook.loginRequiredPhonegap(), Chat.setChatWith);
app.post('/getMyChatWith', Facebook.loginRequiredPhonegap(), Chat.getMyChatWith);

app.post('/register', Facebook.loginRequiredPhonegap(), accounts.register);
app.post('/getUsersListByAddress', Facebook.loginRequiredPhonegap(), accounts.getUsersListByAddress);
app.post('/getBitconnectUsersByKey', Facebook.loginRequiredPhonegap(), accounts.getBitconnectUsersByKey);


app.post('/redeemCoupon', Facebook.loginRequiredPhonegap(), coupons.redeemCoupon);

app.post('/updateapntoken', Facebook.loginRequiredPhonegap(), accounts.updateApnToken);
app.post('/updategcmtoken', Facebook.loginRequiredPhonegap(), accounts.updateGcmToken);
app.post('/changeusername', Facebook.loginRequiredPhonegap(), accounts.changeUsername);
app.post('/mkinvite', Facebook.loginRequiredPhonegap(), accounts.mkInvite);
app.post('/acceptinvite', Facebook.loginRequiredPhonegap(), accounts.acceptInvite);
app.get('/acceptinvite', Facebook.loginRequiredPhonegap(), accounts.acceptInvite);
app.get('/kill', Facebook.loginRequiredPhonegap(), accounts.kill);
app.post('/kill', Facebook.loginRequiredPhonegap(), accounts.kill);
app.get('/me', accounts.getMe);
app.get('/friends', Facebook.loginRequiredPhonegap(), accounts.getFriends);
app.get('/autofill', accounts.autoFill);
app.get('/user', accounts.getUserById);
app.post('/checkname', accounts.checkName);
app.get('/pic', accounts.getPic);
app.get('/auditdata', accounts.printVerificationTable);
app.get('/verificationseed', Facebook.loginRequiredPhonegap(), accounts.printMyVerificationSeed);
app.post('/sendsms', Facebook.loginRequiredPhonegap(), accounts.sendVerificationSMS);
app.post('/verifyaccount', Facebook.loginRequiredPhonegap(), accounts.verifyAccount);
app.get('/globalinvitations', invitations.getInvitationStatusResource);

//setInterval(btc.updateBTCTxs, 60000);
//setTimeout(btc.updateBTCTxs, 1000);

var options = {
    key: fs.readFileSync('ssl/bitconnectwildkey.pem'),
    cert: fs.readFileSync('ssl/bitconnectwildcert.pem'),
    ca: fs.readFileSync('ssl/bitconnectwildca.pem')
};

var dev = true;

if (dev) {

    if (process.env.Production) {
        http.createServer(app).listen(3000);
    } else {
        http.createServer(app).listen(7000);
    }




} else {
    express()
        .get('*', function (req, res) {
            res.redirect('https://' + req.host + req.url);
        })
        .listen(80);
    https.createServer(options, app).listen(443);
}

var config = {
    baseUrl: '/home/bitconnectServer/public/js',
    name: 'main',
    out: '/home/bitconnectServer/build/main-built'
};

/*
 requirejs.optimize(config, function (buildResponse) {
 //buildResponse is just a text output of the modules
 //included. Load the built file for the contents.
 //Use config.out to get the optimized file contents.
 console.log("buildResponse", buildResponse);
 var contents = fs.readFileSync(config.out, 'utf8');

 }, function (err) {
 console.log("err", err);
 });
 */
return app;