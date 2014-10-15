window.app.directive('cpc', ["$rootScope",
    function ($rootScope) {
        return {

            link: function (scope, element, attrs) {
                jQuery(element[0]).intlTelInput();

            }
        };
    }
]);

