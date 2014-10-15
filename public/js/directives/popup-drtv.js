window.app.directive('popup', ["$timeout", '$rootScope', '$location', 'RequestTypes', 'requests',

    function ($timeout, $rootScope, $location, RequestTypes, requests) {
        return {

            link: function ($scope, element, attrs) {


                jQuery(element[0]).magnificPopup({
                    type: 'ajax'
                });


            }
        };
    }
]);

