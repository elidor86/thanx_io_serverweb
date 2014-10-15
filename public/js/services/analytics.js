window.app.service('Analytics', ['$rootScope', '$http', '$q', '$location',
    function ($rootScope, $http, $q, $location) {

        var Analytics = {};

        Analytics.pageTrack = function (page, title) {

            //console.log("pageTrack", page);
            ga('send', 'pageview', {
                'page': page,
                'title': title
            });
        };

        Analytics.clickTrack = function (data) {

            ga('send', {
                'hitType': 'event', // Required.
                'eventCategory': data.eventCategory, // Required.
                'eventAction': data.eventAction, // Required.
                'eventLabel': data.eventLabel,
                'eventValue': data.eventValue
            });

        };


        $rootScope.$on('$routeChangeSuccess', function (angularEvent, current, previous) {


            Analytics.pageTrack($location.path());

        });

        return Analytics;


    }
]);