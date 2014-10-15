window.app.service('me', ['$rootScope', '$http', 'Ddp', function ($rootScope, $http, Ddp) {

    window.rscope = $rootScope;
    //

    var setUser = function (u) {
        $rootScope.user = u ? u : profile;
        $rootScope.firstname = $rootScope.user.fbUser.first_name.toLowerCase();
        $rootScope.lastname = $rootScope.user.fbUser.last_name.toLowerCase();
        $rootScope.username = ($rootScope.user.fbUser.username || ($rootScope.firstname + '_' + $rootScope.lastname)).split('.').join('');

        $rootScope.$safeApply();
    };

    setUser();



    $rootScope.$on('watch_user', function (scope, u, message) {
        console.log("watch changedDoc", u);
        console.log("watch message", message);
        setUser(u);
    });


    /*
     this.getme = function () {
     $http.get('/me')
     .success(function (u) {
     if (!angular.equals(u, $rootScope.user)) {
     $rootScope.user = u;
     $rootScope.firstname = $rootScope.user.fbUser.first_name.toLowerCase();
     $rootScope.lastname = $rootScope.user.fbUser.last_name.toLowerCase();
     $rootScope.username = ($rootScope.user.fbUser.username || ($rootScope.firstname + '_' + $rootScope.lastname)).split('.').join('');
     }
     })
     .error(function (e) {
     console.log(e);
     if (e.result && e.result.error && e.result.error.code == 2500) {
     $rootScope.user = {};
     //window.location.href = '/';
     }
     });
     };
     setInterval(this.getme, 7000);
     this.getme();*/
}]);