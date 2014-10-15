window.controllers.controller('mainCtrl', ['$scope', '$rootScope', '$http', '$location', '$routeParams', 'ChatServices',
    function ($scope, $rootScope, $http, $location, $routeParams, ChatServices) {

        $scope.ChatServices = ChatServices;

        $scope.toggleBtcMode = function () {

            ChatServices.btcmode == "tnx" ? ChatServices.btcmode = "sat" : ChatServices.btcmode = "tnx";
        };

        $scope.getFbProfilePic = function (id, size) {

         //   console.log(id);
            if (id) {
                var width = size ? size : 100;
                var src = $location.protocol() + "://graph.facebook.com/" + id + "/picture?width=" + width + '&height=' + width;
                return src;
            } else {
                return '/img/bitconnect-b-180x180.png';
            }


        };
    }
]);


