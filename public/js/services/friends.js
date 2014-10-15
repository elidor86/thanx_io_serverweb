window.app.service('friends', ['$rootScope', '$http', 'UsersService', '$q',
    function ($rootScope, $http, UsersService, $q) {

        window.rscope = $rootScope;

        this.getMyFriends = function () {
            var deferred = $q.defer();

            FB.api({
                    method: 'fql.query',
                    query: 'SELECT name,uid,is_app_user FROM user  WHERE uid IN (SELECT uid2  FROM friend  WHERE uid1 = me()) order by first_name'
                }, function (data) {

                    $rootScope.FBfriends = {};
                    $rootScope.FBfriends.haveApp = [];
                    $rootScope.FBfriends.dontHaveApp = [];

                    for (var i = 0; i < data.length; i++) {
                        if (data[i].is_app_user) {
                            $rootScope.FBfriends.haveApp.push(data[i]);
                        } else {
                            $rootScope.FBfriends.dontHaveApp.push(data[i]);
                        }
                    }

                    deferred.resolve();
                    console.log(data.length);
                    console.log(data);
                }
            );

            return deferred.promise;
        };

        //this.getMyFriends();

        $rootScope.getfriends = function () {


            $http.get('/friends')
                .success(function (f) {
                    $rootScope.FBfriends = f;
                })
                .error(function (e) {
                    errhandle();
                    $rootScope.getfriends();
                });
        };

        //  $rootScope.getfriends();

        /**
         *   Returns a map of facebook friends by id, filtered by the given text.
         *   Uses UserService.userFilter to filter the users.
         */
        this.getFriendsByPartialName = function getFriendsByPartialName(partialName) {
            if (!$rootScope.FBfriends) {
                return {};
            }
            var friendsById = {};
            var friends = $rootScope.FBfriends.registeredFriends.filter(function (user) {
                return UsersService.userFilter(user, partialName);
            });

            friends.forEach(function (friend) {
                friendsById[friend.id] = {
                    fullname: friend.first_name + ' ' + friend.last_name,
                    id: friend.id,
                    username: friend.username
                };
            });
            return friendsById;
        };
    }
]);