window.app = angular.module('thanxbits', ['ui.bootstrap', 'ngTouch', 'thanxbits.controllers', 'ngRoute', 'ngAnimate']);

window.controllers = angular.module('thanxbits.controllers', []);

var el = function (x) {
    return document.getElementById(x);
};

var qs = function (x) {
    return document.querySelectorAll(x);
};

var errhandle = function (r) {
    console.log("Error", r);
};

window.app.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
            .when('/app/connect', {
                templateUrl: '/partials/connect.html',
                controller: 'InviteFriendsController',
                resolve: {
                    friendsList: [ 'friends', function (friends) {
                        return friends.getMyFriends();
                    }]
                }
            })
            .when('/app/conversations', {
                templateUrl: '/partials/conversations.html',
                controller: 'ConversationsController'
            })
            .when('/app/thanx', {
                templateUrl: '/partials/requests.html',
                controller: 'RequestController'
            })
            .when('/app/give', {
                templateUrl: '/partials/give.html',
                controller: 'GiveController'
            })
            .when('/app/chat/123456thanx', {
                templateUrl: '/partials/super-chat.html',
                controller: 'ChatController',
                resolve: {
                    otherUser: [ '$http', '$route', 'ChatServices', function ($http, $route, ChatServices) {

                      
                        return ChatServices.getOtherUser("userId", '123456thanx');

                    }]
                }

            })
            .when('/app/chat/:otherUserId', {
                templateUrl: '/partials/chat.html',
                controller: 'ChatController',
                resolve: {
                    otherUser: [ '$http', '$route', 'ChatServices', function ($http, $route, ChatServices) {

                        return ChatServices.getOtherUser("userId", $route.current.params.otherUserId);

                    }]
                }

            })
            .when('/app/btc/:otherUserId', {
                templateUrl: '/partials/addresschat.html',
                controller: 'ChatController',
                resolve: {
                    otherUser: [ '$http', '$route', 'ChatServices', function ($http, $route, ChatServices) {

                        return ChatServices.getOtherUser("btc", $route.current.params.otherUserId);

                    }]
                }

            })
            .when('/app/transaction/:id', {
                templateUrl: '/partials/transaction.html',
                controller: 'TransactionController'
            })
            .when('/app/me', {
                templateUrl: '/partials/me.html',
                controller: 'SettingsController'
            })
            .when('/app/settings', {
                templateUrl: '/partials/me.html',
                controller: 'SettingsController'
            })
            .when('/app/newaccount', {
                templateUrl: '/partials/newaccount.html',
                controller: 'NewAccountController'
            })
            .when('/app/info/:userId', {
                templateUrl: '/partials/appprofile.html',
                controller: 'ProfileCtrl',
                resolve: {
                    userid: [  '$route', function ($route) {

                        return $route.current.params.userId;

                    }]
                }
            })
            .otherwise({
                redirectTo: '/app/conversations'
            });
    }
]).config(['$locationProvider',
    function ($locationProvider) {
        $locationProvider.html5Mode(true);
    }
]);

window.app.run(['$rootScope', '$location', 'Analytics',
    function ($rootScope, $location, Analytics) {



        /*
         var content = document.getElementsById('scrollDiv');
         content.addEventListener('touchstart', function (event) {
         this.allowUp = (this.scrollTop > 0);
         this.allowDown = (this.scrollTop < this.scrollHeight - this.clientHeight);
         this.slideBeginY = event.pageY;
         });

         content.addEventListener('touchmove', function (event) {
         var up = (event.pageY > this.slideBeginY);
         var down = (event.pageY < this.slideBeginY)
         this.slideBeginY = event.pageY;
         if ((up && this.allowUp) || (down && this.allowDown))
         event.stopPropagation();
         else
         event.preventDefault();
         });
         */

        $rootScope.FBfriends = typeof FBfriends != "undefined" ? FBfriends : {};


        $rootScope.$safeApply = function () {
            var $scope, fn, force = false;
            if (arguments.length == 1) {
                var arg = arguments[0];
                if (typeof arg == 'function') {
                    fn = arg;
                } else {
                    $scope = arg;
                }
            } else {
                $scope = arguments[0];
                fn = arguments[1];
                if (arguments.length == 3) {
                    force = !!arguments[2];
                }
            }
            $scope = $scope || this;
            fn = fn || function () {
            };
            if (force || !$scope.$$phase) {
                $scope.$apply ? $scope.$apply(fn) : $scope.apply(fn);
            } else {
                fn();
            }
        };

        $rootScope.animationClass = "";

        $rootScope.goTo = function (path, searchValues) {

            if (window.location.pathname.indexOf(path) == -1) {
                $location.path('/app/' + path);
                if (searchValues) {
                    $location.search(searchValues);
                }
            }
        };

        $rootScope.path = function () {
            var p = window.location.pathname.split('/');
            return p[p.length - 1];
        };
        $rootScope.message = {};

        $rootScope.modalCancel = function () {
            if (angular.isFunction($rootScope.message.cancel)) {
                $rootScope.message.cancel();
            }
            $rootScope.message.cancel = null;
            $rootScope.message.body = null;
            $rootScope.message.imgSrc = null;
        };


        $rootScope.errHandle = function (msg) {


            $rootScope.message = {
                body: msg || 'error',
                canceltext: 'cool, thanx'
            };
        };

        $rootScope.confirmDialog = function (msg, action) {
            $rootScope.message = {
                body: msg,
                action: action,
                actiontext: 'yes please',
                canceltext: 'no thanx'
            };
        };

        $rootScope.showMessage = function (msg) {

            Analytics.clickTrack({
                eventCategory: "dialog",
                eventAction: "showMessage",
                eventLabel: msg
            });

            $rootScope.message = {
                body: msg || 'success',
                canceltext: 'cool, thanx'
            };
        };

        $rootScope.toggleMenu = function toggleMenu() {
            Analytics.clickTrack({
                eventCategory: "user",
                eventAction: "nav",
                eventLabel: "toggleMenu"
            });

            $rootScope.menuOpen = !$rootScope.menuOpen;
            $rootScope.connectState = false;
        };

        $rootScope.toggleSearch = function () {
            if ($rootScope.searchContainerState == "select") {
                $rootScope.searchContainerState = "search"
            } else {
                $rootScope.searchContainerState = "select"
            }
        };

        var mainContainer = jQuery("#main-container");
        $rootScope.connectState = false;


        $rootScope.swipeRight = function () {
            if ($rootScope.connectState == true) {
                $rootScope.connectState = false;
            }
        };
        $rootScope.swipeLeft = function () {
            if ($rootScope.menuOpen == true) {
                $rootScope.menuOpen = false;
            }
        };

        $rootScope.toggleConnect = function () {

            Analytics.clickTrack({
                eventCategory: "user",
                eventAction: "nav",
                eventLabel: "toggleConnect"
            });

            //var connectContainer = jQuery("#connect-container");
            // var x = connectContainer.width();

            if ($rootScope.connectState == false) {
                //   connectContainer.css("display", "block");
                // mainContainer.css("z-index", 5);
                //  TweenMax.to(mainContainer, 0.7, { x: -x, opacity: 0.7, ease: Expo.easeInOut});
                // TweenMax.to(connectContainer, 0.7, { opacity: 1, ease: Expo.easeInOut});
                $rootScope.menuOpen = false;
                $rootScope.connectState = true;
            } else {
                //     connectContainer.css("display", "none");
                // mainContainer.css("z-index", 100);
                //  TweenMax.to(mainContainer, 0.5, {  x: 0, opacity: 1, ease: Expo.easeInOut});
                // TweenMax.to(connectContainer, 0.7, { opacity: 0.5, ease: Expo.easeInOut});
                $rootScope.connectState = false;
            }
        };


        $rootScope.getUserAge = function (unit) {
            var now = moment();
            //console.log("getUserAge", moment($rootScope.user.createdAt * 1000).diff(now, unit ? unit : "days"))
            return moment($rootScope.user.createdAt * 1000).diff(now, unit ? unit : "days");
        };

        $rootScope.showQr = function (e) {
            e.preventDefault();
            $rootScope.message = {body: "qr code", imgSrc: "https://blockchain.info/qr?data=" + $rootScope.user.address + "&size=200"};
        };


        $rootScope.$on('$routeChangeSuccess', function (angularEvent, current, previous) {


            if (current.loadedTemplateUrl && current.loadedTemplateUrl.split("/").length >= 2) {
                $rootScope.topPath = "/partials/top/" + current.loadedTemplateUrl.split("/")[2]
            }


            //console.log("previous", previous.loadedTemplateUrl);

            ///partials/chat
            if (previous) {
                if (current.loadedTemplateUrl == "/partials/conversations" && !previous) {
                    // $rootScope.animationClass = "left-to-right-animation";
                } else if (previous.loadedTemplateUrl == "/partials/conversations" && current.loadedTemplateUrl == "/partials/chat") {
                    $rootScope.animationClass = "right-to-left-animation";
                } else if (current.loadedTemplateUrl == "/partials/conversations" && previous.loadedTemplateUrl == "/partials/chat") {
                    $rootScope.animationClass = "left-to-right-animation";
                } else if (current.loadedTemplateUrl == "/partials/conversations" && previous.loadedTemplateUrl == "/partials/connect") {
                    $rootScope.animationClass = "left-to-right-animation";
                } else if (previous.loadedTemplateUrl == "/partials/conversations" && current.loadedTemplateUrl == "/partials/connect") {
                    $rootScope.animationClass = "right-to-left-animation";
                } else {
                    $rootScope.animationClass = "";
                }
            }


        });
    }
]);