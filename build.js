// Array

var compressor = require('node-minify');


/*
 var arr = [
 "lib/underscore-min",
 "lib/jquery-1.10.2.min",
 "lib/jquery-ui.min",
 "lib/jquery.ui.touch-punch.min",
 "lib/angular.min",
 "lib/angular-route.min",
 "lib/angular-animate.min",
 "lib/ui-bootstrap-custom-tpls-0.10.0.min",
 "lib/bitcoinjs-min",
 "bitcoinjs-wrapper",
 "facebook",
 "app",
 "constants",

 "services/ddp",
 "services/spinner",
 "services/me",
 "services/analytics",
 "services/chatServices",
 "services/requests",
 "services/bitcoin",
 "services/friends",
 "services/users",
 "services/global-invitations",
 "services/history",

 "animation/menu",
 "animation/views",
 "animation/search",
 "animation/popup",
 "animation/chat",

 "controllers/mainCtrl",
 "controllers/newaccount",
 "controllers/invitefriends",
 "controllers/request",
 "controllers/newaccount",
 "controllers/profile",
 "controllers/settings",
 "controllers/transaction",
 "controllers/chat",
 "controllers/conversations",
 "controllers/menu",
 "controllers/give",

 "directives/sticky-drtv",
 "directives/infinite-scroll-drtv",
 "directives/connect-container-drtv",
 "directives/history-item-drtv",
 "directives/request-item-drtv",
 "directives/chat-item-drtv",

 "lib/sockjs-0.3",
 "lib/meteor-ddp",
 "lib/sha256",
 "lib/BigInt",
 "lib/sticky",
 "lib/TweenMax.min",
 // "lib/URI",
 "lib/moment-with-langs",
 "lib/jsqrcode/grid",
 "lib/jsqrcode/version",
 "lib/jsqrcode/detector",
 "lib/jsqrcode/formatinf",
 "lib/jsqrcode/errorlevel",
 "lib/jsqrcode/bitmat",
 "lib/jsqrcode/datablock",
 "lib/jsqrcode/bmparser",
 "lib/jsqrcode/datamask",
 "lib/jsqrcode/rsdecoder",
 "lib/jsqrcode/gf256poly",
 "lib/jsqrcode/gf256",
 "lib/jsqrcode/decoder",
 "lib/jsqrcode/qrcode",
 "lib/jsqrcode/findpat",
 "lib/jsqrcode/alignpat",
 "lib/jsqrcode/databr"
 ];
 */

/*
 var arr = [
 "lib/jquery-1.10.2.min",
 "lib/angular.min",
 "lib/sockjs-0.3",
 "lib/meteor-ddp",

 "lib/angular-route.min",
 "lib/angular-animate.min",
 "lib/underscore-min",

 "lib/jquery-ui.min",
 "lib/jquery.ui.touch-punch.min",


 "lib/ui-bootstrap-custom-tpls-0.10.0.min",
 "lib/bitcoinjs-min",
 "bitcoinjs-wrapper",
 "facebook",


 "lib/sha256",
 "lib/BigInt",
 "lib/sticky",
 "lib/TweenMax.min"

 ];
 */
var arr = [
    "lib/URI",
    "lib/moment-with-langs",
    "lib/jsqrcode/grid",
    "lib/jsqrcode/version",
    "lib/jsqrcode/detector",
    "lib/jsqrcode/formatinf",
    "lib/jsqrcode/errorlevel",
    "lib/jsqrcode/bitmat",
    "lib/jsqrcode/datablock",
    "lib/jsqrcode/bmparser",
    "lib/jsqrcode/datamask",
    "lib/jsqrcode/rsdecoder",
    "lib/jsqrcode/gf256poly",
    "lib/jsqrcode/gf256",
    "lib/jsqrcode/decoder",
    "lib/jsqrcode/qrcode",
    "lib/jsqrcode/findpat",
    "lib/jsqrcode/alignpat",
    "lib/jsqrcode/databr"

];


for (var i = 0; i < arr.length; i++) {
    arr[i] = '/home/thanx.ioServer/public/js/' + arr[i] + ".js";
}

new compressor.minify({
    type: 'uglifyjs',
    fileIn: arr,
    fileOut: '/home/thanx.ioServer/public/js/qr.js',
    callback: function (err, min) {
        console.log(err);
//        console.log(min);
    }
});
