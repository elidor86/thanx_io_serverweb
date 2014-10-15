window.controllers.controller('ProfileCtrl', ['$scope', '$rootScope', '$http', '$location', '$routeParams', '$timeout', 'UsersService', 'userid',
    function ($scope, $rootScope, $http, $location, $routeParams, $timeout, UsersService, userid) {
        window.wscope = $scope;
        if (userid) {
            $scope.userId = userid;
        } else {
            $scope.userId = userId;
        }

        UsersService.getUserById($scope.userId, function (user) {
            $scope.user = user;
        });
        //$scope.username = window.location.host.split('.').slice(0,2).join('.')+'.thanx.io'
        $scope.give = function () {
            location.href = "/app/give?toId=" + $scope.userId;
        };

        $scope.get = function () {
            location.href = "/app/get?fromId=" + $scope.userId;
        };
    }
]);