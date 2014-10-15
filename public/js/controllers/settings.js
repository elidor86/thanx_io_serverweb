window.controllers.controller('SettingsController', ['$scope', '$rootScope', '$http', '$location', '$routeParams', 'me', 'requests', 'bitcoin', 'friends',
    function ($scope, $rootScope, $http, $location, $routeParams, me, requests, bitcoin, friends) {

        window.wscope = $scope;
        $scope.meAction = $routeParams.action;
        $scope.verifyState = false;


        $scope.phoneVerifyNextBtn = function () {

        };

        $scope.isUserAgeGreaterThenMonth = function () {

            var diff = $rootScope.getUserAge();
            if (Math.abs(diff) < 30) {
                return false;
            } else {
                return true;
            }

        };

        $scope.UserAgeAbs = function () {

            var diff = $rootScope.getUserAge();
            return Math.abs(diff);


        };

        $scope.getOneMonthDate = function (unit) {
            var date = moment().add('days', $scope.UserAgeAbs());

            if (unit == "day") {
                return date.format("Do");
            } else if (unit == "month") {
                return date.format("MMM");
            }

        };


        $scope.sendtext = function sendtext() {

            var pattern = /^[\s()+-]*([0-9][\s()+-]*){6,20}$/;
            if ($scope.smsInfo) {
                // clear previous error/success msg:
                $scope.smsInfo = '';
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
            if (!pattern.test($scope.phonenum)) {
                $scope.smsInfo = 'invalid phone number';
                return;
            }

            if (!$scope.phonenum) {
                $scope.smsInfo = 'no mobile number entered';
                return;
            }

            $http.post('/sendsms', {
                phone: '+' + $scope.phonenum
            }).success(function () {
                //$scope.smsInfo = 'SMS sent, enter verification code:';
                $scope.verifyState = true;
            }).error(function () {
                $scope.smsInfo = 'an error occured, please try again';
            });
        };

        $scope.verify = function verify() {
            $http.post('/verifyaccount', {
                code: $scope.smscode
            }).success(function (res) {
                if (res.verified) {
                    $scope.user.verified = true;
                }
            }).error(function () {
                $scope.verificationError = 'wrong code. you may request another one above.'
            });
        };


        $scope.checkLogin = function (pw, check, callback) {
            if (pw != check) $rootScope.errHandle('passwords don\'t match');
            else if (pw.length < 8) $rootScope.errHandle('must be 8 chars minimum');
            else {

                var fields = {
                    confirm: {
                        type: 'password'
                    }
                };

                $rootScope.message = {
                    body: 'I understand that without my password, I cannot access bitcoins on my address ,please enter your password again:',
                    action: function () {

                        if ($rootScope.message.fields.confirm.value !== pw) {

                        } else {
                            $rootScope.bitcoinLogin(pw, function () {

                            });
                            $rootScope.message = {};
                        }
                    },
                    fields: fields,
                    actiontext: 'ok',
                    canceltext: 'cancel'
                };
            }

        };

        $scope.amount = "";
        $scope.satAmount = "";

        $scope.buy = function () {
            console.log("$scope.amount", $scope.amount);
            if (angular.isUndefined($scope.amount) || $scope.amount < 10000)
                return $rootScope.errHandle("minimum buy 10000");
            if ($scope.amount > $scope.balance - 10000)
                return $rootScope.errHandle("not enough bts");

            var msg = "are you sure you would like to get " + $scope.amount + " thanx with " + $scope.amount + " satoshi? a transaction fee of 10,000 satoshi will be added ";

            $rootScope.confirmDialog(msg, function () {
                $rootScope.buyTnx($scope.amount);
            });
        };

        $scope.txError = false;
        $scope.buySat = function () {
            console.log("$scope.amount", $scope.satAmount);
            if (angular.isUndefined($scope.satAmount) || $scope.satAmount < 10000)
                return $rootScope.errHandle("minimum buy 10000");
            if ($scope.satAmount > $rootScope.user.tnx - 10000)
                return $rootScope.errHandle("not enough thanks");

            var msg = "are you sure you would like to get " + $scope.amount + " satoshi with " + $scope.amount + " thanx? a transaction fee of 10,000 satoshi will be added ";

            $rootScope.confirmDialog(msg, function () {
                $http.post('/buysat', {amount: $scope.satAmount})
                    .success(function () {
                        $rootScope.message = {};
                        $location.path("/app/chat/123456thanx");
                    })
                    .error(function () {
                        $rootScope.message = {};
                        $scope.txError = true;
                    });
                //buysat
            });
        };

        $scope.logout = function () {
            $http.post('/logout').success(function () {
                window.location.href = '/';
            });
        };

        // Kill account (testing only)
        $scope.kill = function () {
            $http.post('/kill')
                .success(function (r) {
                    $rootScope.user = r;
                    location.href = '/app/newaccount';
                })
                .error(errhandle);
        };

        $scope.toggleChangeUsername = function toggleChangeUsername() {
            $scope.changingUsername = !$scope.changingUsername;
        };

        $scope.checkname = function () {
            $scope.newUsernameLegal = /^[a-zA-Z][0-9a-zA-Z_-]{3,15}$/.test($scope.newUsername);
            $http.post('/checkname', {
                name: $scope.newUsername + '.thanx.io'
            })
                .success(function (r) {
                    if (r == '"available"') $scope.newUsernameAvailable = true;
                    else $scope.newUsernameAvailable = false;
                })
                .error(errhandle);
        };

        $scope.changeUsername = function changeUsername() {
            $http.post('/changeusername', {
                username: $scope.newUsername + '.thanx.io'
            }).success(function (r) {
                $scope.changingUsername = false;
                me.getme();
            });
        }
        $scope.$watch('newUsername', function (value) {
            if (value) {
                $scope.checkname(value);
            }
        });
    }
]);