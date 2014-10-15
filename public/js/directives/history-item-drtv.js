window.app.directive('historyItem', ['$location', '$timeout', 'TxTypes',
    function ($location, $timeout, TxTypes) {
        return {
            restrict: 'E',
            scope: {
                item: '=',
                otherUser: '='
            },
            /*template: '<img ng-if="item.txType != \''+TxTypes.inviteReward+'\' && item.txType != \''+TxTypes.signupReward+'\' && otherUser.fbUser" ng-src="/pic?userne={{otherUser.username}}&size=100" width="50px" height="50px" class="friendImg"/>' +
             '<img ng-if="item.txType != \''+TxTypes.inviteReward+'\' && item.txType != \''+TxTypes.signupReward+'\' && !otherUser.fbUser && otherUser" ng-src="https://en.bitcoin.it/w/images/en/2/29/BC_Logo_.png" width="50px" height="50px" class="friendImg"/>' +
             '<img ng-if="item.txType == \''+TxTypes.inviteReward+'\' || item.txType == \''+TxTypes.signupReward+'\'" ng-src="{{ item.tnx ? \'/img/x.svg\' : \'/img/s.svg\'}}" width="50px" height="50px" class="friendImg"/>' +
             '<div class="body" ng-class="{cancelled: item.cancelled || item.rejected}">' +
             '<div ng-if="item.txType != \''+TxTypes.inviteReward+'\' && item.txType != \''+TxTypes.signupReward+'\'" title="{{otherUser.username}}" ng-class="{realUser: otherUser.fbUser}" class="fbname" ng-click="goToUserPage()">{{ otherUser.fbUser ? otherUser.fbUser.first_name + \'  \'+ otherUser.fbUser.last_name : otherUser}}</div>' +
             '<div ng-if="item.txType == \''+TxTypes.inviteReward+'\' || item.txType == \''+TxTypes.signupReward+'\'" title="Reward" class="fbname">reward</div>' +
             '<div ng-if="item.tnx" class="tnx">{{otherUser == item.payer ? \'+\' : \'-\' }}{{ item.tnx }} thanx</div>' +
             '<div ng-if="item.sat" class="sat">{{otherUser == item.payer ? \'+\' : \'-\' }}{{ item.sat }} satoshi</div>' +
             '<div ng-if="item.message && !(item.rejected || item.cancelled)" class="message">{{ item.message.slice(0,200) }}</div>' +
             '<div ng-if="item.rejected" class="message">this request was rejected</div>' +
             '<div ng-if="item.cancelled" class="message">this request was cancelled</div>' +
             '</div>',*/
            template: '<a href="#" class="row tap-h", ng-click="goToUserPage()">' +
                '<div class="l">' +
                '<img ng-if="item.otherUser.id!=\'123456thanx\' && item.txType != \'' + TxTypes.inviteReward + '\' && item.txType != \'' + TxTypes.signupReward + '\' && otherUser.fbUser" ng-src="{{ getFbProfilePic(otherUser.id) }}" />' +
                '<img ng-if="item.otherUser.id==\'123456thanx\' || item.txType != \'' + TxTypes.inviteReward + '\' && item.txType != \'' + TxTypes.signupReward + '\' && !otherUser.fbUser && otherUser" ng-src="/img/bitconnect-b-180x180.png">' +
                '<img ng-if="item.otherUser.id!=\'123456thanx\' && item.txType == \'' + TxTypes.inviteReward + '\' || item.txType == \'' + TxTypes.signupReward + '\'" ng-src="{{ item.tnx ? \'/img/x.svg\' : \'/img/s.svg\'}}"/>' +
                '</div>' +
                '<div class="c">' +
                '<div class="name" ng-if="item.otherUser.id==\'123456thanx\' || item.txType ==\'buySat\' || item.txType == \'' + 'buyTnx' + '\'" title="{{otherUser.username}}">{{ otherUser.username }}</div>' +
                '<div class="name" ng-if="item.otherUser.id!=\'123456thanx\' &&  item.txType != \'' + TxTypes.inviteReward + '\' && item.txType != \'' + TxTypes.signupReward + '\'&& item.txType !=\'buySat\' && item.txType != \'' + 'buyTnx' + '\'" title="{{otherUser.username}}">{{ otherUser.fbUser ? otherUser.fbUser.first_name + \'  \'+ otherUser.fbUser.last_name : otherUser}}</div>' +
                '<div class="name" ng-if="item.otherUser.id!=\'123456thanx\' && item.txType == \'' + TxTypes.inviteReward + '\' || item.txType == \'' + TxTypes.signupReward + '\'&& item.txType !=\'buySat\' && item.txType != \'' + 'buyTnx' + '\'" title="Reward">reward</div>' +
                '<div class="mes" style="font-weight: {{ weight }}">{{message}}</div>' +
                '</div>' +
                '<div class="r">' +
                '<div class="date"> {{ fromNow }} </div>' +
                '<div ng-if="item.pendingInCounter > 0" class="alert">{{pendingInCounter }}</div>' +
                '<div ng-if="item.pendingOutCounter > 0" class="alert bg-gray" style="margin-right: 1rem;">{{pendingOutCounter }}</div>' +

                '</div>' +
                '<div class="clear"></div>' +
                '</a>',
            controller: ['$scope', '$rootScope', '$location',
                function ($scope, $rootScope, $location) {

                    $scope.$watch('item', function (scope, Conversation, message) {

                        $scope.message = Conversation.message.replace(/<br>/igm, "");

                        var pattern = /\[(.*?)\]/;
                        var link = $scope.message ? $scope.message.match(pattern) : null;

                        if (link) {
                            var data = link[1].split(",");
                            $scope.message = $scope.message.replace(pattern, data[1]);
                        }

                        $scope.weight = Conversation.isSeenReceiver ? 400 : 700;

                        $scope.pendingCounter = Conversation.pendingCounter;
                        $scope.pendingInCounter = Conversation.pendingInCounter;
                        $scope.pendingOutCounter = Conversation.pendingOutCounter;
                        var diff = $scope.item.timestamp * 1000 - new Date().getTime();
                        // console.log(Math.abs(diff));
                        if (Math.abs(diff) < 1000 * 60 * 1) {
                            $scope.fromNow = "just now"
                        } else {
                            $scope.fromNow = moment($scope.item.timestamp * 1000 + 1000).fromNow();
                        }

                    });


                    $scope.getFbProfilePic = function (id, size) {
                        var width = size ? size : 100;
                        var src = $location.protocol() + "://graph.facebook.com/" + id + "/picture?width=" + width + '&height=' + width;
                        return src;
                    };

                    $scope.goToUserPage = function goToUserPage() {
                        if (typeof $scope.otherUser == "object") {
                            $rootScope.goTo('chat/' + $scope.otherUser.id);
                        } else if (typeof $scope.otherUser == "string") {
                            $rootScope.goTo('btc/' + $scope.otherUser);
                        }
                    };

                }
            ],
            link: function linkFn(scope, element) {


                $timeout(function () {
                    jQuery(angular.element(element)).find('.friendImg').draggable({
                        axis: 'x',
                        containment: element.parent(),
                        drag: function (event, ui) {
                            if (ui.position.left > 550) {
                                //$("#well").fadeOut();
                            }
                        },
                        stop: function (event, ui) {
                            if (ui.position.left < angular.element(element.parent()).width() - angular.element(this).width() - 4) {
                                jQuery(this).animate({
                                    left: "-2px"
                                });
                            } else {
                                $location.path('/app/transaction/' + scope.item.id);
                            }
                        }
                    });
                });
            }
        };
    }
]);