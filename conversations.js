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

    try {
        var isNew = Conversations[request.sender.id] && Conversations[request.sender.id][request.recipient.id] ? false : true;


        processReq(request.sender.id, request);
        processReq(request.recipient.id, request);


        var obj = {
            isNew: isNew
        };

        var pubsubMsg1 = {
            action: 'conversation',
            obj: getUserConversationsWithId(request.sender.id, request.recipient.id, obj)
        };

        var pubsubMsg2 = {
            action: 'conversation',
            obj: getUserConversationsWithId(request.recipient.id, request.sender.id, obj)
        };

        ee.emit('sendMsg', request.sender.id, pubsubMsg1);
        ee.emit('sendMsg', request.recipient.id, pubsubMsg2);
    }
    catch (e) {
        console.log("newRequest Conversations error ", e);

    }

});


ee.on("updateRequest", function (myId, request) {
    console.log("makeMessage has occured", request);


    try {
        processReq(request.sender.id, request, true);
        processReq(request.recipient.id, request, true);

        var pubsubMsg1 = {
            action: 'conversation',
            obj: getUserConversationsWithId(request.sender.id, request.recipient.id)
        };

        var pubsubMsg2 = {
            action: 'conversation',
            obj: getUserConversationsWithId(request.recipient.id, request.sender.id)
        };

        ee.emit('sendMsg', request.sender.id, pubsubMsg1);
        ee.emit('sendMsg', request.recipient.id, pubsubMsg2);

    } catch (err) {
        console.log("updateRequest Conversations error ", err);
    }

});


var Conversations = {};

var processReq = function (myId, req, updating) {

    var otherUser = (req.sender.id == myId || req.sender == myId) ? req.recipient : req.sender;
    var otherUserId = otherUser.id ? otherUser.id : otherUser;

    // console.log("req ", req);
    //console.log("processReq otherUserId ", otherUserId);
    // console.log("processReq myId ", myId);

    if (Conversations[myId] && Conversations[myId][otherUserId]) {

        var currentItem = Conversations[myId][otherUserId];

        if (req.isPending && (req.sat || req.tnx)) {

            if ((req.requestType == 'GIVE' && req.sender.id == myId)) {
                Conversations[myId][otherUserId].pendingOutCounter = Conversations[myId][otherUserId].pendingOutCounter + 1;
            } else if ((req.requestType == 'GET' && req.sender.id == myId)) {
                Conversations[myId][otherUserId].pendingInCounter = Conversations[myId][otherUserId].pendingInCounter + 1;
            }


        } else if (!req.isPending && updating) {
            if ((req.requestType == 'GIVE' && req.sender.id == myId)) {
                Conversations[myId][otherUserId].pendingOutCounter = Conversations[myId][otherUserId].pendingOutCounter - 1;
            } else if ((req.requestType == 'GET' && req.sender.id == myId)) {
                Conversations[myId][otherUserId].pendingInCounter = Conversations[myId][otherUserId].pendingInCounter - 1;
            }
        }

        var currentTime = currentItem.updateTimestamp ? currentItem.updateTimestamp : currentItem.timestamp;
        var newReqTime = req.updateTimestamp ? req.updateTimestamp : req.timestamp;

        // console.log("newReqTime ", newReqTime);
        //  console.log("currentTime ", currentTime);


        if (newReqTime > currentTime) {
            Conversations[myId][otherUserId].message = req.message;
            Conversations[myId][otherUserId].timestamp = newReqTime;
            Conversations[myId][otherUserId].isSeenReceiver = req.isSeenReceiver;
            Conversations[myId][otherUserId].requestType = req.requestType;
            Conversations[myId][otherUserId].amount = req.tnx ? req.tnx : req.sat;
            Conversations[myId][otherUserId].units = req.tnx ? 'tnx' : 'sat';
            Conversations[myId][otherUserId].direction = req.sender.id == myId ? 'incoming' : "outgoing";
        }

    } else {
        if (!Conversations[myId])
            Conversations[myId] = {};

        Conversations[myId][otherUserId] = {
            otherUserId: otherUserId,
            uid: myId,
            id: req.id,
            amount: req.tnx ? req.tnx : req.sat,
            units: req.tnx ? 'tnx' : 'sat',
            pendingInCounter: 0,
            pendingOutCounter: 0,
            timestamp: req.updateTimestamp ? req.updateTimestamp : req.timestamp,
            message: req.message,
            isSeenReceiver: req.isSeenReceive,
            requestType: req.requestType,
            direction: req.sender.id == myId ? 'incoming' : "outgoing",
            otherUser: otherUser
        }

    }

};

var getMyConversations = FBify(function (profile, req, res) {
    var scope = {};

    console.log("getMyConversations ");

    var start = new Date().getTime();

    async.series([

            function (cb) {
                var q = {
                    $or: [
                        {
                            'sender.id': profile.id
                        },
                        {
                            'recipient.id': profile.id
                        }
                    ]
                };

                db.Request.find(q).toArray(setter(scope, 'reqs', cb));
            },
            function (cb) {
                var end = new Date().getTime();
                console.log("diff ", end - start);

                _.each(scope.reqs, function (conversation, key, list) {
                    processReq(profile.id, conversation);
                });

                cb();
            }
        ],
        mkrespcb(res, 400, function () {

            //  console.log("getMyConversations ", Conversations);
            var myconversation = [];


           // var size = _.size(Conversations[profile.id]);
            //var counter = 0;
            ///var keys = _.keys(Conversations[profile.id]);

            /*
             while (counter < 20 && counter < size - 1) {
             Conversations[profile.id][keys[counter]].userHave = true;
             myconversation.push(Conversations[profile.id][keys[counter]]);
             counter = counter + 1;
             }*/


            _.each(Conversations[profile.id], function (conversation, key, list) {

                myconversation.push(conversation);
            });


            myconversation = _.sortBy(myconversation, function (item) {
                return -(item.updateTimestamp ? item.updateTimestamp : item.timestamp);
            });

            var chat = myconversation.splice(0, 20);
            res.json(chat);

            for (var i = 0; i < chat.length; i++) {
                Conversations[profile.id][chat[i].otherUserId].userHave = true;
            }

        }));
});

var getNextBatch = FBify(function (profile, req, res) {
    var scope = {};

    console.log("getNextBatch ");
    //  console.log("getMyConversations ", Conversations);
    var myconversation = [];


    _.each(Conversations[profile.id], function (conversation, key, list) {
        myconversation.push(conversation);
    });

    var chat = [];
    myconversation = _.sortBy(myconversation, function (item) {
        return -(item.updateTimestamp ? item.updateTimestamp : item.timestamp);
    });

    var counter = 0;
    for (var i = 0; i < myconversation.length; i++) {

        if (!myconversation[i].userHave) {
            chat.push(myconversation[i]);
            counter = counter + 1;
        }

        if (counter == 20) {
            break;
        }

    }

    res.json(chat);

    for (var i = 0; i < chat.length; i++) {
        Conversations[profile.id][chat[i].otherUserId].userHave = true;
    }

});

var getUserConversations = function (userId) {
    return Conversations[userId];
};

var deleteUserConversations = function (userId) {
    delete Conversations[userId];
};

var getUserConversationsWithId = function (userId, otherId, obj) {
    console.log("getUserConversationsWithId userId", userId);
    console.log("getUserConversationsWithId otherId", otherId);

    var conversation = Conversations[userId] ? Conversations[userId][otherId] : null;

    if (conversation && obj && typeof obj == 'object') {
        conversation = _.extend(conversation, obj);
    }
    return conversation;
};


module.exports = {
    getMyConversations: getMyConversations,
    processReq: processReq,
    getUserConversationsWithId: getUserConversationsWithId,
    deleteUserConversations: deleteUserConversations,
    getNextBatch: getNextBatch,
    getUserConversations: getUserConversations
};


