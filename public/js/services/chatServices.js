window.app.service('ChatServices', ['$rootScope', "Ddp", "HistoryService", "$q", "$http",
    function ($rootScope, Ddp, HistoryService, $q, $http) {

        var ChatServices = {};


        ChatServices.requestMode = "send";
        ChatServices.btcmode = "tnx";


        ChatServices.otherUser = "send";

        ChatServices.getOtherUser = function (type, id) {
            var deferred = $q.defer();


            $http.get('/user?' + type + '=' + id).success(function (otherUser) {

                ChatServices.otherUser = otherUser;
                deferred.resolve(otherUser);
            });

            return deferred.promise;
        };


        return ChatServices;
    }
]);