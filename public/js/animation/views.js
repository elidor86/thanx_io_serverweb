window.app
    .animation('.page-animation', ['$rootScope', function ($rootScope) {

        return {
            enter: function (element, done) {

                //

                var time = 0.5;

                var width = jQuery(".content").width();
                switch ($rootScope.animationClass) {
                    case "bottom-to-top-animation":
                        TweenMax.from(element, time, {opacity: 0, y: 200, onComplete: function () {
                            done();
                        }});
                        break;
                    case "top-to-bottom-animation":
                        TweenMax.from(element, time, {opacity: 0, y: -200, onComplete: function () {
                            done();
                        }});
                        break;
                    case "right-to-left-animation":
                        TweenMax.from(element, time, { x: width, onComplete: function () {
                            done();
                        }});
                        break;

                    case "left-to-right-animation":
                        TweenMax.from(element, time, { x: -width, onComplete: function () {
                            done();
                        }});
                        break;


                    default:
                        done();

                }


            },

            leave: function (element, done) {

                var time = 0.5;
                var width = jQuery(".content").width();

                switch ($rootScope.animationClass) {
                    case "bottom-to-top-animation":
                        TweenMax.to(element, time, {opacity: 0, y: -200, onComplete: function () {
                            done();
                        }});
                        break;
                    case "top-to-bottom-animation":
                        TweenMax.to(element, time, {opacity: 0, y: 200, onComplete: function () {
                            done();
                        }});
                        break;
                    case "right-to-left-animation":
                        TweenMax.to(element, time, { x: -width, onComplete: function () {
                            done();
                        }});
                        break;
                    case "left-to-right-animation":
                        TweenMax.to(element, time, { x: width, onComplete: function () {
                            done();
                        }});
                        break;
                    default:
                        done();

                }


            }
        }
    }]);
