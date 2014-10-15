
require.config({
    baseUrl: '/js',
    paths: {
        'jQuery': 'lib/jquery-1.10.2.min',
        'angular': '//ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular',
        'angular-resource': '//ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular-resource'
    },
    shim: {
        'angular' : {'exports' : 'angular'},
        'angular-resource': { deps:['angular']},
        'angular-route': { deps: ['angular']},
        'jQuery': {'exports' : 'jQuery'}
    }
});


require(

    [
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
    ],
    function (_, $, three) {

    });