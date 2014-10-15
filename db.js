var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    BSON = require('mongodb').BSON,
    fs = require('fs'),
    ObjectID = require('mongodb').ObjectID,
    constants = require('./constants');

var host = process.env.MONGO_NODE_DRIVER_HOST != null ? process.env.MONGO_NODE_DRIVER_HOST : 'localhost';
var port = process.env.MONGO_NODE_DRIVER_PORT != null ? process.env.MONGO_NODE_DRIVER_PORT : Connection.DEFAULT_PORT;


var db = new Db('bitconnect', new Server(host, port), {
    safe: false
}, {
    auto_reconnect: true
}, {});

module.exports = {};


db.open(function (err, dbb) {
    if (err) {
        throw err;
    }
    db = dbb;

    var databases = {
        'users': 'User',
        'coupons': 'Coupons',
        'fbinvite': 'FBInvite',
        'requests': 'Request',
        'request-archive': 'RequestArchive',
        'transactions': 'Transaction',
        'system-params': 'SystemParam'
    };

    var callback = function (err, collection) {
        if (err) {
            throw err;
        }
        module.exports[databases[v]] = collection;
    };


    for (var v in databases) {
        db.collection(v, callback);
    }


    db.collection('system-params').findOne({
        key: constants.SystemParamKeys.globalInvitations
    }, function (err, param) {
        if (err || !param) {
            db.collection('system-params').insert({

                "key": "GLOBAL_INVITATIONS",
                "value": {
                    "limit": 32,
                    "remaining": 32,
                    "active": true
                }
            });
        }
    });


    var readUrls = function () {


        var file = fs.readFileSync('/home/new_c_ids.txt');
        file = file.toString('utf8');
        //console.log('fileName', file);

        var urlsArr = file.split('\r');


        for (var i = 0; i < urlsArr.length - 1; i++) {

            // var tmp = urlsArr[i];
            // tmp = tmp.split(".")[0];
            //var id = tmp.replace("https://", "");
            var id = urlsArr[i];

            var coupon = {
                "id": id,
                "isConsumed": false,
                flag: "meetup",
                consumedArr: [],
                counter: 0,
                "units": 111111,
                "unitsType": "tnx",
                "createdDate": new Date().getTime() / 1000
            };

            console.log("coupon", coupon);

            // db.collection('coupons').insert(coupon);

        }


        // console.log('urlsArr', urlsArr);


    };

    //  readUrls();

    var util = require('./util');
    var eh = util.eh;
    var tnx = require('./tnx');
    var config = require('./config');

    var fixUserNames = function () {
        db.collection('users').find({})
            .toArray(function (user, arr) {

                // console.log(user);
                //console.log(arr);
                for (var i = 0; i < arr.length; i++) {

                    var user = arr[i];

                    console.log(user.id);
                    var msg = "hey alpha testers, here’s 123,456 thanx for being a select few who joined thanx.io in a pre-beta phase. please click accept. all previous thanx have been reset. thanx for using thanx.io... and please invite all your friends";
                    tnx.makeGiveRequest(config.superUser, user.id, 0, 123456, msg, null, null);

                    if (user.id == "641665226") {


                    }

                    /*

                     if (user.fbUser && user.fbUser.username) {


                     var username = user.fbUser.username ? user.fbUser.username.split('.').join('') : undefined,
                     altUsername = (user.fbUser.first_name + '_' + user.fbUser.last_name).split('.').join('').toLowerCase();

                     db.collection('users').update({
                     id: user.id
                     }, {
                     $set: {
                     username: username + ".thanx.io"
                     }
                     });

                     console.log("username", username);


                     if (!username || !/^[a-zA-Z][0-9a-zA-Z_-]{3,50}$/.test(username)) {
                     username = altUsername;
                     if (!username || !/^[a-zA-Z][0-9a-zA-Z_-]{3,50}$/.test(username)) {

                     } else {

                     }
                     }
                     }*/


                    /*
                     db.collection('users').update({
                     id: user.id
                     }, {
                     $set: {
                     tnx: 0,
                     createdAt: new Date().getTime() / 1000
                     }
                     });*/


                }


            });
    };

    var fixReqUserNames = function () {
        console.log("fixReqUserNames ");
        db.collection('requests').find({})
            .toArray(function (err, arr) {

                // console.log(user);
                //console.log(arr);
                for (var i = 0; i < arr.length; i++) {

                    var request = arr[i];

                    if (request && request.sender && request.sender.fbUser && request.sender.fbUser.first_name == undefined) {
                        console.log("request.sender.fbUser.first_name ", request);
                    }


                }


            });
    };

    // fixReqUserNames();

    //fixUserNames();
});