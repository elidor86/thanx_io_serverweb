window.app
    .animation('.search-animation', function () {

        return {


            beforeAddClass: function (element, className, done) {

                if (className == 'ng-hide') {

                    TweenMax.fromTo(element, 0.5, { y: 0, opacity: 1}, { opacity: 0, y: 20, onComplete: function () {
                        done();
                    }});
                    //this function is called when the animation ends or is cancelled

                } else {
                    done();
                }
            },

            /*
             * make sure to call the done() function when the animation is complete.
             */
            removeClass: function (element, className, done) {

                if (className == 'ng-hide') {

                    TweenMax.to(element, 0.5, {y: 0, opacity: 1, onComplete: function () {
                        done();
                    }});

                    //this function is called when the animation ends or is cancelled
                    return function () {
                        //remove the style so that the CSS inheritance kicks in

                    }
                } else {
                    done();
                }
            }
        }
    });
