window.app
    .animation('.popup-animation', function () {

        return {

            /*
             * make sure to call the done() function when the animation is complete.
             */
            beforeAddClass: function (element, className, done) {

                if (className == 'ng-hide') {

                    TweenMax.fromTo(element, 0.2, { y: 0, opacity: 1}, {  y: 50, opacity: 0, onComplete: function () {
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

                    TweenMax.to(element, 0.5, {opacity: 1, y: 0, onComplete: function () {
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

