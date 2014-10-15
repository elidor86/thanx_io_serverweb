window.app.directive('connectContainer', ["$rootScope",

    function ($rootScope) {
        return {

            link: function (scope, element, attrs) {
                console.log("connectContainer");

                var resizeHandler = function () {

                    var windowWidth = jQuery(window).width();
                    if (windowWidth < 760) {
                        jQuery(element[0]).width(windowWidth - 50);
                    } else {
                        jQuery(element[0]).css("width", "45rem");
                    }

                };

                jQuery(window).resize(resizeHandler);

                jQuery(window).resize();


            }
        };
    }
]);

