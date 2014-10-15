window.app.service('GlobalInvitationsService', ['$rootScope', '$http', function ($rootScope, $http) {


    $rootScope.$on('watch_InvitationStatus', function (scope, result, message) {
        console.log("InvitationStatus changedDoc", result);
        console.log("InvitationStatus message", message);

        $rootScope.usedInvitations = result.usedInvitations;
        $rootScope.invitationLimit = result.invitationLimit;
        $rootScope.remaining = result.remaining;

        $rootScope.$safeApply();
    });

    /*
     function updateLimit() {
     $http.get('/globalinvitations').success(function(result) {
     $rootScope.usedInvitations = result.limit - result.remaining;
     $rootScope.invitationLimit = result.limit;
     });
     }
     updateLimit();
     setInterval(updateLimit, 10000);
     */
}]);