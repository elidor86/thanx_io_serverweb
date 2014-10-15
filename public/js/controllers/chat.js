window.controllers.controller('ChatController', ['$scope', '$location', 'Spinner', 'otherUser', "Ddp", 'RequestTypes', 'requests', '$rootScope', '$timeout', '$http', '$routeParams', 'HistoryService', 'me', 'bitcoin', 'ChatServices',
    function ($scope, $location, Spinner, otherUser, Ddp, RequestTypes, requests, $rootScope, $timeout, $http, $routeParams, HistoryService, me, bitcoin, ChatServices) {

        $routeParams.otherUserId = $routeParams.otherUserId ? $routeParams.otherUserId : "123456thanx";

        $scope.ChatServices = ChatServices;
        $scope.otherUser = otherUser;
        $scope.interactions = [];
        $scope.interactions1 = [];
        $scope.interactionsObj = {};
        $scope.pagingData = {
            have: 0,
            count: 0,
            posWas: 0,
            initializing: false,
            isFirstTime: true
        };



        $scope.getFbProfilePic = function (id, size) {

            if (id) {
                var width = size ? size : 100;
                var src = $location.protocol() + "://graph.facebook.com/" + id + "/picture?width=" + width + '&height=' + width;
                return src;
            } else {
                return '/img/bitconnect-b-180x180.png';
            }
        };


        var Citem = function (citem) {
            _.extend(this, citem);
            this.time = new Date(this.timestamp * 1000);

            if (angular.isDefined(this.sender) && this.sender.id === $rootScope.user.id) {
                this.direction = 'outgoing';
            } else {
                this.direction = 'incoming';
            }

            this.isLoss = (angular.isDefined(this.payer) && this.payer.id === $rootScope.user.id)
                || (this.requestType === RequestTypes.GET && this.direction === 'incoming')
                || (this.requestType === RequestTypes.GIVE && this.direction === 'outgoing');
            this.isGain = (angular.isDefined(this.payee) && this.payee.id === $rootScope.user.id) ||
                (this.requestType === RequestTypes.GIVE && this.direction === 'incoming') ||
                (this.requestType === RequestTypes.GET && this.direction === 'outgoing');

        };

        var loadChatFromStorage = function () {
            var chatHistory = HistoryService.getLocalStorage($routeParams.otherUserId, true);
            var tmp = _.sortBy(chatHistory, function (item) {
                return item.timestamp;
            });
            $scope.interactions1 = tmp.splice(0, 20);
            $scope.$safeApply();
        };

        //loadChatFromStorage();

        $scope.subChat = function () {
            Spinner.start();
            $scope.pagingData.initializing = true;
            Ddp.subscribe('chat', [$rootScope.user.id, $routeParams.otherUserId, $scope.pagingData.isFirstTime ? 0 : $scope.pagingData.have]);
        };

        $scope.subChat();

        var sortChatArr = function () {

            $scope.interactions1 = _.sortBy($scope.interactionsObj, function (item) {
                return item.timestamp;
            });

            var now = new Date().getTime();

            for (var i = 1; i < $scope.interactions1.length; ++i) {
                var time1 = $scope.interactions1[i].timestamp;
                var time2 = $scope.interactions1[i - 1].timestamp;


                var absDiff = Math.abs(time2 - time1);
                var Day = 1000 * 1 * 60 * 60 * 24;

                //console.log("Math.abs((time1 * 1000 ) - now)", Math.abs((time1 * 1000 ) - now));
                if (Math.abs((time1 * 1000 ) - now) < 1000 * 1 * 60 * 60 * 24) {
                    //   console.log("smaller");
                    //    console.log("absDiff", absDiff);
                    //    console.log("message", $scope.interactions1[i].message);

                    if (absDiff > 60 * 10) {
                        $scope.interactions1[i].showLine = true;
                        var timeStr = moment($scope.interactions1[i].timestamp * 1000).calendar();
                        $scope.interactions1[i].formatTime = timeStr.toLowerCase();
                    }
                } else {
                    if (absDiff > 60 * 60) {
                        $scope.interactions1[i].showLine = true;

                        var timeStr = moment($scope.interactions1[i].timestamp * 1000).calendar();
                        $scope.interactions1[i].formatTime = timeStr.toLowerCase();
                    }
                }


            }
            $scope.$safeApply();
        };


        $scope.scrollBtm = function () {
            var content = jQuery('.content'),
                chatContainer = jQuery('#chat-container');

            content.scrollTop(
                    chatContainer.height() + content.height()
            );
        };

        $scope.$on('subscribeReady_chat', function (scope) {

            Spinner.complete();

            if ($scope.pagingData.isFirstTime) {
                var reqId = $location.search().reqId;
                if (angular.isString(reqId)) {
                    scrollTo(reqId);
                    TweenMax.fromTo(jQuery('#' + reqId), 3, {backgroundColor: "#f7931a"}, {backgroundColor: "transparent"});
                } else {
                    if ($scope.lastSeenId) {
                        scrollTo($scope.lastSeenId);
                    } else {
                        $scope.scrollBtm();
                    }

                }

            } else if ($scope.pagingData.isFirstTime == false && $scope.pagingData.goTo) {
                scrollTo($scope.pagingData.goTo);
            }


            $scope.pagingData.initializing = false;
            $scope.pagingData.isFirstTime = false;

            //   $scope.interactionsObj = Ddp.client.getCollection("chat");
            $scope.pagingData.count = Ddp.client.getCollection("counters").currentChat.count;
            $scope.pagingData.have = _.size(Ddp.client.getCollection("chat"));
            //sortChatArr();
            //HistoryService.setLocalStorage($routeParams.otherUserId, $scope.interactionsObj);

            console.log("subscribe Ready Chat", $scope.pagingData);
        });


        $scope.$on('watch_chat', function (scope, interaction, message) {

            if (message == "added" || message == "changed") {

                $scope.add_change_doc(interaction);


            } else if (message == "removed") {


            }


        });

        $scope.reject = function (citem, direction) {
            requests.rejectRequest(citem, direction);
        };

        $scope.accept = function accept(citem) {
            requests.acceptRequest(citem);
        };


        var scrollTo = function (el) {
            var container = jQuery('.content'),
                scrollTo = jQuery('#' + el);

            if (scrollTo.offset()) {
                container.scrollTop(
                        scrollTo.offset().top - container.offset().top + container.scrollTop()
                );
            }
        };


        $scope.lastSeenId = null;
        $scope.add_change_doc = function (doc) {

            if (doc.lastSeen) {
                $scope.lastSeenId = doc.id;

            }

            $scope.interactionsObj[doc.id] = new Citem(doc);
            sortChatArr();
            //HistoryService.setLocalStorage($routeParams.otherUserId, $scope.interactionsObj);
        };

        $scope.$on('updateRequest', function (scope, request) {
            $scope.add_change_doc(request);
        });


        jQuery(".content").bind('scroll', function () { //when the user is scrolling...
            var pos = jQuery(".content").scrollTop(); //position of the scrollbar

            if (pos > $scope.pagingData.posWas) { //if the user is scrolling down...
                //do something
            }
            if ($scope.pagingData.initializing == false && $scope.pagingData.count > $scope.pagingData.have && pos < 50 && pos < $scope.pagingData.posWas) { //if the user is scrolling up...
                //do something
                $scope.pagingData.goTo = $scope.interactions1[0].id;
                Ddp.unSubscribe('chat');
                $scope.subChat();
                //console.log("its time to get more chat !!!", $scope.pagingData);
            }
            $scope.pagingData.posWas = pos; //save the current position for the next pass
        });


        /*

         this.getInteraction = function getInteraction(firstTime) {
         function dumpInteraction(i) {
         return {
         id: i.id,
         cancelled: i.cancelled,
         rejected: i.rejected
         };
         }

         if (firstTime) {
         var cachedInteraction = HistoryService.getCachedInteractionWithUser($routeParams.otherUserId);
         if (cachedInteraction) {
         $scope.interaction = cachedInteraction;
         $timeout(function () {
         jQuery('html,body').scrollTop(jQuery('body')[0].scrollHeight);
         });
         return;

         }
         }
         HistoryService.getInteractionWithUser($routeParams.otherUserId, function (err, interaction) {
         if (!interaction) {
         $rootScope.goTo('app/conversations');
         }
         $scope.interaction = $scope.interaction || [];
         var oldInteraction = $scope.interaction.map(dumpInteraction);
         var newInteraction = interaction.map(dumpInteraction);
         if (!angular.equals(oldInteraction, newInteraction)) {
         $scope.interaction = interaction;
         if (firstTime) {
         $timeout(function () {
         jQuery('html,body').scrollTop(jQuery('body')[0].scrollHeight);
         });
         }
         }
         });
         };

         */


        $scope.$watch('ChatServices.btcmode', function (newValue, oldValue) {
            //console.log("newValue", newValue);
            // console.log("oldValue", oldValue);

            if (newValue == 'sat' && !$rootScope.user.address) {
                $rootScope.message = {
                    body: 'you do not have bitcoin address, create one now?',
                    action: function () {
                        $rootScope.message = null;
                        $location.path('/app/me').search({action: "btcaddress"});
                    },
                    cancel: function () {
                        //console.log("cancel");
                        ChatServices.btcmode = "tnx"
                    },
                    actiontext: 'yep',
                    canceltext: 'nope'
                };

                return;
            }

            if (newValue == 'sat' && !otherUser.isAddress && !otherUser.address) {

                $rootScope.message = {
                    body: otherUser.fullname + ' has not generated a bitcoin address. would you like to send a message explaining how to do that?"',
                    action: function () {

                        $rootScope.message = null;
                        var msg = "hi, please click [/app/me?action=btcaddress,here] to generate a bitcoin address. we'll then be able to send thanx as well as satoshi to each other. thanx :)";
                        $scope.tx.tnx = "";
                        $scope.tx.message = msg;
                        $scope.sendMessage();
                        ChatServices.btcmode = "tnx";

                    },
                    cancel: function () {
                        //console.log("cancel");
                        ChatServices.btcmode = "tnx";
                    },
                    actiontext: 'yep',
                    canceltext: 'nope'
                };
            }


        });

        $scope.tx = {tnx: "", sat: "", message: ""};

        $scope.isMoneyTx = function isMoneyTx() {
            return ((!ChatServices.btcmode || ChatServices.btcmode == 'tnx') && $scope.tx.tnx) || (ChatServices.btcmode === 'sat' && $scope.tx.sat) || (ChatServices.btcmode === 'dollar' && $scope.tx.dollar);
        };

        function setSubmitDisabled(disabled) {
            $scope.submitDisabled = disabled;
        }

        function clearValues() {
            $scope.tx = {tnx: "", sat: "", message: ""};
        }

        function errHandler(err) {
            setSubmitDisabled(false);
            if (err) {
                $rootScope.errHandle(err);
            }
        }

        function onRequestSend() {
            $rootScope.message = {
                body: 'request sent!',
                canceltext: 'cool tnx'
            };
            setSubmitDisabled(false);
            clearValues();
        }


        $scope.requestMode = 'send';

        if (otherUser.isAddress) {
            ChatServices.btcmode = "sat";
        } else {
            ChatServices.btcmode = "tnx";
        }


        $scope.sendMessage = function sendMessage() {

            if ($scope.submitDisabled) return;

            if (ChatServices.btcmode == "tnx") {
                if (($scope.tx.tnx == "" ) && $scope.tx.message == "") {
                    return
                }
            }
            else {
                if (($scope.tx.sat == ""  ) && $scope.tx.message == "") {
                    return
                }
            }

            setSubmitDisabled(true);

            if (((!ChatServices.btcmode || ChatServices.btcmode === 'tnx') && parseInt($scope.tx.tnx) > 0) ||
                ((ChatServices.btcmode === 'sat') && parseInt($scope.tx.sat) > 0)) {
                if ($scope.requestMode === 'receive') {
                    $scope.get();
                } else {
                    $scope.give();
                }
                return;
            }

            var tmpTx = $scope.tx;
            $scope.tx = {tnx: "", sat: "", message: ""};

            $http.post('/mkrequest', {
                tnx: 0,
                giveTo: $routeParams.otherUserId,
                message: tmpTx.message,
                requestType: RequestTypes.GIVE
            })
                .success(function (r) {
                    r.isNew = true;
                    $scope.add_change_doc(r);
                    setSubmitDisabled(false);
                    //clearValues();
                })
                .error(errHandler);
        };

        $scope.Keypress = function (e) {

            // console.log('$(e.target).val().length', $(e.target).val().length);


            var char = String.fromCharCode(e.which);
            if (e.keyCode == 13) {

                e.preventDefault();

                $scope.sendMessage();

            }


        };

        $scope.numKeypress = function (e) {


            if (e.keyCode == 13) {

                e.preventDefault();

                $scope.sendMessage();

            } else if (!String.fromCharCode(e.which).match(/\d/)) {
                e.preventDefault();
            }


        };


        $scope.give = function give() {
            setSubmitDisabled(true);
            if ((!ChatServices.btcmode || ChatServices.btcmode === 'tnx') && parseInt($scope.tx.tnx) > 0) {
                giveTnxNotSafe();
            } else if (ChatServices.btcmode == 'dollar' && parseFloat($scope.tx.dollar) > 0.01) {
                $scope.tx.tnx = ((parseFloat($scope.tx.dollar) * 100000000) / $rootScope.price).toFixed();
                giveTnxNotSafe();
            } else if (ChatServices.btcmode == 'sat' && parseFloat($scope.tx.sat) > 0) {
                giveSatNotSafe();
                setSubmitDisabled(false);
            }
        };

        $scope.get = function get() {
            setSubmitDisabled(true);

            if ((!ChatServices.btcmode || ChatServices.btcmode === 'tnx') && parseInt($scope.tx.tnx) > 0) {
                getTnxNotSafe();
            } else if (ChatServices.btcmode == 'dollar' && parseFloat($scope.tx.dollar) > 0.01) {
                $scope.tx.tnx = ((parseFloat($scope.tx.dollar) * 100000000) / $rootScope.price).toFixed();
                getTnxNotSafe();
            } else if (ChatServices.btcmode == 'sat' && parseFloat($scope.tx.sat) > 0) {
                getSatNotSafe();
            }
        };

        function getTnxNotSafe() {
            $http.post('/mkrequest', {
                tnx: parseInt($scope.tx.tnx),
                getFrom: $routeParams.otherUserId,
                message: $scope.tx.message,
                requestType: RequestTypes.GET
            })
                .success(function (r) {
                    r.isNew = true;
                    $scope.add_change_doc(r);
                    setSubmitDisabled(false);
                    clearValues();
                })
                .error(errHandler);
        }

        function getSatNotSafe() {
            $http.post('/mkrequest', {
                sat: parseInt($scope.tx.sat),
                getFrom: $routeParams.otherUserId,
                message: $scope.tx.message,
                requestType: RequestTypes.GET
            })
                .success(function (r) {
                    r.isNew = true;
                    $scope.add_change_doc(r);
                    setSubmitDisabled(false);
                    clearValues();
                })
                .error(errHandler);
        }

        function giveTnxNotSafe() {

            if ($rootScope.user.tnx < parseInt($scope.tx.tnx)) {
                $rootScope.message = {
                    body: 'not enough thanx to give',
                    canceltext: 'ok'
                };
                setSubmitDisabled(false);
                return;
            }

            $http.post('/mkrequest', {
                tnx: parseInt($scope.tx.tnx),
                giveTo: $routeParams.otherUserId,
                message: $scope.tx.message,
                requestType: RequestTypes.GIVE
            })
                .success(function (r) {
                    r.isNew = true;
                    $scope.add_change_doc(r);
                    setSubmitDisabled(false);
                    clearValues();
                })
                .error(errHandler);
        }

        function giveSatNotSafe() {
            console.log("giveSatNotSafe", parseInt($scope.tx.sat));
            $rootScope.bitcoinSend($routeParams.otherUserId, parseInt($scope.tx.sat), 10000, $scope.tx.message, undefined, errHandler);
        }

        // var timer = setInterval(this.getInteraction, 5000);

        var that = this;


        /*$timeout(function () {
         that.getInteraction(true);
         });*/

        $scope.$on("$destroy", function () {
            // console.log("$destroy");
            Ddp.unSubscribe('chat');
        });
    }
]);

window.controllers.controller('HeaderChatController', ['$scope', 'RequestTypes', 'requests', '$rootScope', '$timeout', '$http', '$routeParams', 'HistoryService', 'me', 'bitcoin', 'ChatServices',
    function ($scope, RequestTypes, requests, $rootScope, $timeout, $http, $routeParams, HistoryService, me, bitcoin, ChatServices) {
        $scope.ChatServices = ChatServices;
        $scope.otherUser = ChatServices.otherUser;


    }
]);