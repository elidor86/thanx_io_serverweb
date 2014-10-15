fs = require('fs');
apn = require('apn');
gcm = require('node-gcm');

var options = null;

if (process.env.production) {


    options = {
        cert: 'thanxio_production_Cert.pem',
        passphrase: 'Elidor123',
        address: 'gateway.push.apple.com',
        key: 'thanxio_producction_Key.pem'
    };

} else {

    console.log("develop");
    options = {
        cert: 'thanxio_develop_Cert.pem',
        passphrase: 'Elidor123',
        key: 'thanxio_producction_Key.pem'
    };
}


/*
 if (process.env.production) {

 } else {
 options = {
 passphrase: 'Elidor8686'
 };
 }*/


var apnConnection = new apn.Connection(options);

console.log('(process.env.NODE_ENV === "production")', (process.env.NODE_ENV === "production"));


/*
 var feedback = new apn.Feedback({
 "batchFeedback": true,
 "interval": 300,
 cert: 'production_cert.pem',
 passphrase: 'Elidor8686',
 key: 'production_key.pem'
 });

 feedback.on("feedback", function (devices) {
 console.log('feedback devices', devices);
 devices.forEach(function (item) {
 console.log(item);
 });
 });
 */

var sendNotification = function (ApnToken, GcmToken, payload, msg) {

    console.log("sendNotification ApnToken", ApnToken);
    console.log("sendNotification GcmToken", GcmToken);

    if (ApnToken) {
        var myDevice = new apn.Device(ApnToken);
        var note = new apn.Notification();

        note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
        note.alert = msg;
        note.payload = payload;
        note.sound = "push.caf";

        apnConnection.pushNotification(note, myDevice);
    }

    if (GcmToken) {

        var message = new gcm.Message({
            //collapseKey: 'demo',
            delayWhileIdle: true,
            timeToLive: 3,
            data: {
                message: msg,
                notId: 12345,
                payload: payload
            }
        });

        var sender = new gcm.Sender('AIzaSyCmIAfq6eHJ6lpCYx_7LSPFy5GksWQYtz4');

        var registrationIds = [GcmToken];

        sender.send(message, registrationIds, 4, function (err, result) {
            console.log(result);
        });
    }

};


//sendNotification(null, 'APA91bEOSEUKmXAnQDhT-xlBFmGnSt268_1vegBDlDHY4GHmtkiXNnZ01QudnoCJjYXsw_K0zH9JTDmy_EWX7RDShePUdxYOnJhNw-KCRB6_RKAIdB7XM9e7_PjhowKQa7e7F2ges4HOcGUyxbpQTsMw1hQrp8Ra2w', 'test', 'test');

setTimeout(function () {
    //sendNotification('5e88afb9b9e0c8e1e53d270ea70f6c82f87edbd04fdc37c8ac5532e5ca4823e5');
}, 3000);


module.exports = {
    sendNotification: sendNotification
};


