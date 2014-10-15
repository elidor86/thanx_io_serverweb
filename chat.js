var db = require('./db'),
    _ = require('underscore'),
    util = require('./util'),
    pubsub = require('./pubsub'),
    ee = require("./events-emitter").event,
    async = require('async');


var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;


ee.on("newRequest", function (myId, request) {
    console.log("makeMessage has occured", request);

    var pubsubMsg = {
        action: 'newChatMsg',
        obj: request
    };

    ee.emit('sendMsg', request.sender.id, pubsubMsg);
    ee.emit('sendMsg', request.recipient.id, pubsubMsg);
});

ee.on("updateRequest", function (myId, request) {
    console.log("makeMessage has occured", request);

    var pubsubMsg = {
        action: 'updateChatMsg',
        obj: request
    };

    ee.emit('sendMsg', request.sender.id, pubsubMsg);
    ee.emit('sendMsg', request.recipient.id, pubsubMsg);
});


var getMyChatWith = FBify(function (profile, req, res) {

    var scope = {},
        otherUserId = req.param('otherUserId') || null,
        have = req.param('have') || 0;


    console.log("getMyChatWith have", have);
    if (!otherUserId) {
        res.json([]);
        return;
    }

    async.series([
            function (cb) {
                var q = {
                    $or: [
                        {
                            'sender.id': profile.id,
                            'recipient.id': otherUserId
                        },
                        {
                            'sender.id': profile.id,
                            'recipient': otherUserId
                        },
                        {
                            'recipient.id': profile.id,
                            'sender': otherUserId
                        },
                        {
                            'recipient.id': profile.id,
                            'sender.id': otherUserId
                        }
                    ]
                };

                var options = {
                    sort: {timestamp: -1},
                    limit: have + 20
                };
                db.Request.find(q, options).toArray(setter(scope, 'chat', cb));
            }
        ],
        mkrespcb(res, 400, function () {

            var mychat = [];

            _.each(scope.chat, function (item, key, list) {
                mychat.unshift(item);
            });

            res.json(mychat);
        }));
});


var setChatWith = FBify(function (profile, req, res) {

    var scope = {},
        otherUserId = req.param('otherUserId') || null;


    console.log("setChatWith otherUserId", otherUserId);


    async.series([
            function (cb) {
                db.User.update({
                    id: profile.id
                }, {
                    $set: {
                        currentChat: otherUserId
                    }
                }, cb);
            }
        ],
        mkrespcb(res, 400, function () {
            res.json({});
        }));

});


module.exports = {
    getMyChatWith: getMyChatWith,
    setChatWith: setChatWith
};


