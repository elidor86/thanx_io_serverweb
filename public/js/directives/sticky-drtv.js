window.app.directive('sticky', ["$rootScope",


    function ($rootScope) {
        return {

            link: function (scope, element, attrs) {

                //console.log("sticky");

                var elTop = jQuery("#connect-top");
                var elContent = jQuery("#connect-content");

                var elTopH = elTop.height();
                var isVisible = true;
                var fix = function () {

                    var el = jQuery(element[0]);
                    var elAnchor = jQuery("#connect-anchor");

                    // console.log("el.offset().top", el.offset().top);
                    //  console.log("el.scrollTop()", elTopH);


                    if (isVisible && elAnchor.offset().top <= elTopH) {
                        isVisible = false;

                        el.css({
                            "position": "fixed",
                            "left": el.offset().left,
                            "top": elTopH,
                            "z-index": 2000,
                            "width": el.width()
                        });
                        //el.css("display", "none");
                        // TweenMax.to(elTop, 0.1, { height: "14rem", ease: Expo.easeInOut});
                        //TweenMax.to(elContent, 0.1, { top: "14rem", ease: Expo.easeInOut});
                    } else if (isVisible == false && elAnchor.offset().top > elTopH + 5) {
                        el.css({
                            "position": "relative",
                            "left": 0,
                            top: 0
                        });
                        isVisible = true;
                        //TweenMax.to(elTop, 0.1, { height: "10rem", ease: Expo.easeInOut});
                        //TweenMax.to(elContent, 0.1, { top: "10rem", ease: Expo.easeInOut});
                        // el.css("display", "block");
                    }
                };


                jQuery("#connect-content").scroll(function () {

                    //console.log("scrolllllllllllllllllllll");
                    fix()
                });
                /*
                 var raw = element[0];

                 jQuery(element[0]).parent().bind('scroll', function () {
                 if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
                 scope.$apply(attrs.whenScrolled);
                 }
                 });*/

            }
        };
    }
]);

