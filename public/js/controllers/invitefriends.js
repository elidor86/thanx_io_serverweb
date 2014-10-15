window.controllers.controller('InviteFriendsController', ['$scope', '$timeout', '$window', "Ddp", '$rootScope', '$http', '$location', 'me', 'requests', 'bitcoin', 'friends', 'Analytics', 'GlobalInvitationsService',
    function ($scope, $timeout, $window, Ddp, $rootScope, $http, $location, me, requests, bitcoin, friends, Analytics, GlobalInvitationsService) {

        window.wscope = $scope;
        var btcAddressRegex = /^[13][1-9A-HJ-NP-Za-km-z]{26,33}/;

        $scope.FBfriends = {};

        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                // the user is logged in and has authenticated your
                // app, and response.authResponse supplies
                // the user's ID, a valid access token, a signed
                // request, and the time the access token
                // and signed request each expire
                console.log("response", response);
                var uid = response.authResponse.userID;
                var accessToken = response.authResponse.accessToken;


                FB.api({
                        method: 'fql.query',
                        query: 'SELECT name,uid,is_app_user FROM user  WHERE uid IN (SELECT uid2  FROM friend  WHERE uid1 = me()) order by first_name'
                    }, function (data, e) {
                        //console.log("data", data);
                        console.log("e", e);

                        if (e) {

                        } else {
                            $scope.FBfriends.haveApp = [];
                            $scope.FBfriends.dontHaveApp = [];

                            for (var i = 0; i < data.length; i++) {
                                if (data[i].is_app_user) {
                                    $scope.FBfriends.haveApp.push(data[i]);
                                } else {
                                    $scope.FBfriends.dontHaveApp.push(data[i]);
                                }
                            }

                            $scope.fbFriends = $scope.FBfriends.dontHaveApp;
                            $rootScope.$safeApply();


                        }


                    }
                );

            } else if (response.status === 'not_authorized') {
                // the user is logged in to Facebook,
                // but has not authenticated your app
            } else {
                // the user isn't logged in to Facebook.
            }
        });


        $scope.analyzeQR = function analyzeQR(event) {

            var invalid = function () {
                $scope.searchText = "invalid qr code";

                $timeout(function () {
                    $scope.searchText = "";
                }, 3000);
                $rootScope.$safeApply();
            };

            qrcode.callback = function (result) {

                console.log("result", result);

                if (result === 'error decoding QR Code') {
                    invalid();
                    return;
                }


                if (btcAddressRegex.test(result)) {
                    $scope.searchText = result;
                    $rootScope.$safeApply();
                    return;
                }

                var uri = new URI(result);

                if (uri.protocol() != 'bitcoin') {
                    invalid();
                    return;
                }


                var address = uri.path();
                if (address && btcAddressRegex.test(address)) {
                    $scope.searchText = address;
                    $rootScope.$safeApply();
                    return;
                }

                invalid();

                /*
                 var query = uri.search(true);

                 if (query.amount) {
                 //   $scope.give.sat = query.amount * 100000000;
                 }
                 if (query.message) {
                 //  $scope.give.message = query.message;
                 }*/
            };

            var img = new Image();
            img.onload = function () {
                qrcode.decode(img.src);
            };

            img.src = $window.URL.createObjectURL(event.target.files[0]);
        };
        jQuery('#qrcode').on('change', $scope.analyzeQR);

        $scope.setImg = function () {
            console.log("setImg");
            jQuery('#qrcode').click();
        };

        $scope.connectContentState = "list";
        // Control the visible friend list
        $scope.visibleFriendsLimit = 20;
        //chunk of friends to get when scrolling down
        $scope.friendsChunk = 30;
        $scope.visibleFriends = {};
        //$rootScope.$watch('user.fbUser',$scope.getfriends);

        $scope.getRemaining = function () {

            if ($rootScope.remaining) {
                return $rootScope.remaining - $scope.numselected;
            } else {
                return 128 - $scope.numselected;
            }

        };

        $scope.giveget = function () {
            window.location.href = '/giveget';
        };

        $scope.searchText = "";

        //$scope.fbFriends = $rootScope.FBfriends.dontHaveApp;
        $scope.bitUsers = [];

        var getBitconnectUsersByKey = function () {
            var promise = Ddp.call('getUsersListByKeyword', [ $scope.searchText]);

            promise.then(function (data) {
                //   console.log("getBitconnectUsersByKey", data);

                for (var i = 0; i < data.length; i++) {

                    if (data[i].uid == $rootScope.user.id) {
                        data.splice(i, 1);
                        continue;
                    }


                    for (var x = 0; x < $scope.FBfriends.haveApp.length; x++) {
                        if (data[i].uid == $scope.FBfriends.haveApp[x].uid) {
                            data.splice(i, 1);
                            break;
                        }

                    }

                }


                $scope.bitUsers = data;
                $scope.$safeApply();
            });
        };

        $scope.btcAddressToSend = null;

        var getBitconnectUsersByAddress = function () {

            var promise = Ddp.call('getUsersListByAddress', [ $scope.searchText]);

            $scope.bitUsers = [];
            $scope.fbFriends = [];
            promise.then(function (data) {
                console.log("getBitconnectUsersByKey", data);

                if (data) {

                    $scope.bitUsers.push(data);
                } else {
                    $scope.btcAddressToSend = $scope.searchText;
                }

                $scope.$safeApply();


            });
        };

        $scope.invalidAddress = false;

        $scope.$watch('searchText', function (scope, request) {

            Analytics.clickTrack({
                eventCategory: "connect",
                eventAction: "search",
                eventLabel: $scope.searchText
            });

            $scope.invalidAddress = false;
            //  console.log("searchText", $scope.searchText);
            $scope.btcAddressToSend = null;
            if ($scope.searchText == "") {
                $scope.fbFriends = $scope.FBfriends.dontHaveApp;
            } else {
                if ($scope.searchText.length >= 3 && $scope.searchText.length <= 25) {
                    getBitconnectUsersByKey();
                } else if ($scope.searchText.length >= 25 && btcAddressRegex.test($scope.searchText)) {
                    if ($rootScope.validateBbcAddress($scope.searchText)) {
                        getBitconnectUsersByAddress();
                    } else {
                        $scope.invalidAddress = true;

                    }
                    return
                } else {
                    $scope.bitUsers = [];
                }

                var filteredUsers = [];

                for (var i = 0; i < $scope.FBfriends.dontHaveApp.length; i++) {

                    if (new RegExp("\(" + $scope.searchText + ")", "gi").test($scope.FBfriends.dontHaveApp[i].name)) {
                        filteredUsers.push($scope.FBfriends.dontHaveApp[i]);
                    }
                }


                $scope.fbFriends = filteredUsers;
            }
        });

        $scope.setConnectContentState = function (state) {

            $scope.connectContentState = state;

        };

        $scope.isIvniteAllMode = false;

        $scope.isSelectAll = false;
        $scope.selectAll = function () {

            if ($scope.isSelectAll) {

                for (var i = 0; i < $scope.fbFriends.length; i++) {
                    var user = $scope.fbFriends[i];
                    $scope.fbFriends[i].isSelected = false;
                }
                $scope.selected = [];
                $scope.numselected = 0;
                $scope.isSelectAll = false;

            } else {
                for (var i = 0; i < $scope.fbFriends.length; i++) {

                    var user = $scope.fbFriends[i];
                    if (!user.isSelected) {
                        $scope.selected[user.uid] = user;
                        $scope.numselected += 1;
                        $scope.fbFriends[i].isSelected = true;
                    }

                }

                $scope.isSelectAll = true;
            }


        };

        $scope.cancel = function (state) {
            //  $scope.selected = {};
            //  $scope.numselected = 0;
            Analytics.clickTrack({
                eventCategory: "connect",
                eventAction: "cancel"
            });
            $scope.setConnectContentState('list');
        };


        $scope.updateVisibleFriends = function () {
            var filter = function (f) {
                if (!$scope.searchstring)
                    return true;
                var friendString = (f.first_name + ' ' + f.last_name).toLowerCase(),
                    searchString = $scope.searchstring.toLowerCase();
                return friendString.indexOf(searchString) >= 0;
            };
            if ($rootScope.user && $rootScope.user.friends && $scope.FBfriends) {
                $scope.filteredFriends = $scope.FBfriends.otherFriends.filter(filter);
                var nvf = $scope.filteredFriends.slice(0, $scope.visibleFriendsLimit),
                    nvflist = nvf.map(function (x) {
                        return x.id;
                    }),
                    ovflist = ($scope.visibleFriends.otherFriends || []).map(function (x) {
                        return x.id;
                    });
                if (JSON.stringify(nvflist) != JSON.stringify(ovflist)) {
                    $scope.visibleFriends.otherFriends = nvf;
                }
            }
        };

        //$rootScope.$watch('FBfriends', $scope.updateVisibleFriends);

        // Select friends
        $scope.selected = {};
        $scope.numselected = 0;

        $scope.friendsLimit = 50;
        $scope.selectFriend = function (user) {


            var id = user.uid;
            if (!$scope.selected[id]) {


                Analytics.clickTrack({
                    eventCategory: "connect",
                    eventAction: "selectFriend",
                    eventLabel: user.uid
                });

                /*
                 if ($scope.getRemaining() <= 0) {
                 $rootScope.message = {
                 body: "there are no more invitations in the system. you can invite the current selection of friends, or unselect some friends in order to invite others",
                 canceltext: 'cool, thanx'
                 };
                 return
                 }*/

                /*
                 if ($scope.numselected >= 50) {
                 $rootScope.message = {
                 body: "you have selected 50 friends, the maximum allowed by facebook in one batch. please click invite to send these 50 invitations, and and then select more in another batch",
                 canceltext: 'cool, thanx'
                 };
                 return
                 }*/


                user.isSelected = true;
                if ($scope.numselected < $rootScope.invitationLimit - $rootScope.usedInvitations) {
                    $scope.selected[id] = user;
                    $scope.numselected += 1;
                }
            } else {

                Analytics.clickTrack({
                    eventCategory: "connect",
                    eventAction: "unSelectFriend",
                    eventLabel: user.uid
                });

                user.isSelected = false;
                delete $scope.selected[id];
                $scope.numselected -= 1;

            }
            $scope.$safeApply();
        };


        $scope.loadMoreFriends = function () {

            Analytics.clickTrack({
                eventCategory: "connect",
                eventAction: "loadMoreFriends"
            });

            console.log("loadMoreFriends", $scope.FBfriends);

            if (angular.isUndefined($scope.FBfriends) || angular.isUndefined($scope.FBfriends.dontHaveApp)) {
                return;
            }

            $scope.friendsLimit = $scope.friendsLimit + 50;

        };

        $scope.selectNone = function () {
            $scope.selected = {};
            $scope.numselected = 0;
        };

        $scope.clearSelection = function () {

            for (var i = 0; i < $scope.fbFriends.length; i++) {
                $scope.fbFriends[i].isSelected = false;
            }
            $scope.selected = {};
            $scope.numselected = 0;
            $scope.isSelectAll = false;
        };


        var fbInviteAll = function (skip, pSelected) {
            var idArr = [];

            var selected = [];

            if (pSelected) {
                selected = pSelected;
            } else {
                _.each($scope.selected, function (user, key, list) {
                    selected.push(user);
                });
            }


            var max = skip + 50 <= selected.length ? skip + 50 : selected.length;

            for (var i = skip; i < max; i++) {
                idArr.push(selected[i].uid);
            }


            FB.ui({
                method: 'apprequests',
                to: idArr,
                title: 'come bitconnect with me :)',
                message: 'it’s an amazing cool new way to connect with friends. you’ll get 12345 thanx :)'
            }, function (req) {
                if (!req || angular.isUndefined(req.to)) {
                    /*
                     console.log('skip + 50', skip + 50);
                     console.log(' $scope.selected', selected.length);

                     if (skip + 50 <= selected.length) {
                     fbInviteAll(skip + 50);
                     }*/
                    return
                } else {
                    console.log(req);
                    $scope.clearSelection();
                    $scope.setConnectContentState('list');
                    $http.post('/mkinvite', {
                        from: $rootScope.user.id,
                        to: idArr,
                        reqid: req.request
                    });


                    if (skip + 50 <= selected.length) {
                        fbInviteAll(skip + 50, selected);
                    }
                }


            });

        };


        // Invite friends
        $scope.invite = function () {
            //console.log(friendId.toString());

            $rootScope.toggleConnect();


            if ($scope.numselected > 50) {
                $rootScope.message = {
                    body: 'you have selected ' + $scope.numselected + ' friends, who will be invited in batches of 50. send requests in the following ' + Math.ceil($scope.numselected / 50) + ' facebook windows',
                    action: function () {
                        $rootScope.message = {};
                        fbInviteAll(0);

                    },
                    cancel: function () {
                        $scope.clearSelection();
                        $scope.cancel();

                    },
                    actiontext: 'ok',
                    canceltext: 'cancel'
                };
            } else {
                fbInviteAll(0);
            }


            Analytics.clickTrack({
                eventCategory: "connect",
                eventAction: "invite"
            });


        };


        $scope.inviteAll = function (state) {

            Analytics.clickTrack({
                eventCategory: "connect",
                eventAction: "inviteAll"
            });

            $rootScope.toggleConnect();

            fbInviteAll(0);


        };


        // Done
        $scope.done = function () {
            $rootScope.goTo('thanx');
        };


    }
]);