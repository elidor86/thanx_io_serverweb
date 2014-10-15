fs = require('fs');
var db = require('./db'),
    _ = require('underscore'),
    ee = require("./events-emitter").event,
    ortcNodeclient = require('ibtrealtimesjnode').IbtRealTimeSJNode,
    conversations = require('./conversations'),
    util = require('./util');

var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;


ortcClient = new ortcNodeclient();

/*
 ee.on("newRequest", function (request) {
 console.log("makeMessage has occured", request);

 });*/


ee.on("sendMsg", function (ch, msg) {
    console.log("sendMsg has occured");
    sendMsg(ch, msg);
});


ee.on("rawSend", function (usersList) {
    console.log("rawSend has occured", usersList);

    for (var x = 0; x < usersList.length; x++) {
        var user = usersList[x];

        var msg = {
            action: "balanceUpdate",
            obj: {
                amount: user.amount
            }
        };

        sendMsg(user.id, msg);
    }

});


ortcClient.setId('clientId');
ortcClient.setConnectionMetadata('server');
ortcClient.setClusterUrl('http://ortc-developers.realtime.co/server/2.1/');

var subscribe = function (ch) {

    console.log("subscribe ", ch);
    /* ortcClient.subscribe(ch, true,
     function (ortc, channel, message) {
     // Received message: 'message' - at channel: 'channel'
     });*/

};

var sendMsg = function (ch, msg) {

    console.log("sendMsg ch", ch);
    console.log("sendMsg msg", msg);

    if (typeof msg == 'object') {
        msg = JSON.stringify(msg);
    }
    /*
     console.log("ortcClient.isConnected()", ortcClient.isConnected()  );
     if (!ortcClient.isConnected())
     return;*/

    ortcClient.send(ch, msg);
};


var subMe = FBify(function (profile, req, res) {
    var scope = {};


    conversations.deleteUserConversations(profile.id);

    //subscribe(profile.id);
    console.log("subMe ");




    ortcClient.presence({
            applicationKey: 'lKrTYO',
            authenticationToken: '6AgDJcLHH16T',
            isCluster: true,
            url: 'http://ortc-developers.realtime.co/server/2.1/',
            channel: profile.id,
            metadata: true
        },
        function (error, result) {
            if (error) {
                console.log('Presence error:', error);
            } else {
                if (result) {
                    console.log('Number of subscribers', result.subscriptions);

                    if (result.subscriptions == 0) {
                        //conversations.deleteUserConversations(profile.id);


                    }
                    for (var metadata in result.metadata) {
                        console.log(metadata, '-', result.metadata[metadata]);
                    }
                } else {
                    console.log('No subscribers');
                }
            }
        }
    );


    res.json({});
});


ortcClient.onConnected = function (ortc) {
    // Messaging client is connected

    console.log("onConnected !!!!!!!!!!!!!!!!");


    /*
    ortcClient.subscribe('641665226', false, function (ortc, channel, message) {
        console.log("Received message: ", message);
    });*/


};

ortcClient.onException = function (ortc, exception) {
    console.log("onException", exception);
};

ortcClient.onDisconnected = function (ortc) {
    console.log("onDisconnected", ortc);
};

ortcClient.onReconnected = function (ortc) {
    console.log("onReconnected");
};

ortcClient.onSubscribed = function (ortc, channel) {
    // console.log("onSubscribed ortc", ortc);
    console.log("onSubscribed channel", channel);

    ortcClient.enablePresence({
            applicationKey: 'lKrTYO',
            channel: channel,
            privateKey: '6AgDJcLHH16T',
            url: 'http://ortc-developers.realtime.co/server/2.1/',
            isCluster: true,
            metadata: true
        },
        function (error, result) {
            if (error) {
                console.log('Presence', error);
            } else {
                console.log('Presence enable', result);
            }
        });
    //sendMsg("641665226", {a: "test"});
};


ortcClient.connect('lKrTYO', '6AgDJcLHH16T');


/*
 ortcClient.onSubscribed = function (ortc, channel) {
 // Subscribed to the channel 'channel';
 // Sending HelloWorld message
 ortcClient.send(channel, 'Hello World');
 };*/




//sendNotification(null, 'APA91bEOSEUKmXAnQDhT-xlBFmGnSt268_1vegBDlDHY4GHmtkiXNnZ01QudnoCJjYXsw_K0zH9JTDmy_EWX7RDShePUdxYOnJhNw-KCRB6_RKAIdB7XM9e7_PjhowKQa7e7F2ges4HOcGUyxbpQTsMw1hQrp8Ra2w', 'test', 'test');


setTimeout(function () {
    //sendNotification('5e88afb9b9e0c8e1e53d270ea70f6c82f87edbd04fdc37c8ac5532e5ca4823e5');
}, 3000);


module.exports = {
    sendMsg: sendMsg,
    subMe: subMe,
    subscribe: subscribe
};


