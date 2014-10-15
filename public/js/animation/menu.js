window.app
    .animation('.show-hide-animation', function () {

        return {

            /*
             * make sure to call the done() function when the animation is complete.
             */
            beforeAddClass: function (element, className, done) {

                if (className == 'ng-hide') {

                    TweenMax.fromTo(element, 0.5, { x: 0}, {  x: -jQuery('.me').width(), onComplete: function () {
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

                    TweenMax.fromTo(element, 0.5, {opacity: 0, x: -jQuery('.me').width()}, {opacity: 1, x: 0, onComplete: function () {
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

window.app
    .animation('.connect-animation', function () {

        return {

            /*
             * make sure to call the done() function when the animation is complete.
             */
            beforeAddClass: function (element, className, done) {
                if (className == 'ng-hide') {

                    TweenMax.fromTo(element, 0.5, { x: 0}, {  x: jQuery(element[0]).width(), onComplete: function () {

                        done();
                        jQuery(element[0]).css("-webkit-transform", "");
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

                    TweenMax.fromTo(element, 0.5, {opacity: 0, x: jQuery(element[0]).width()}, {opacity: 1, x: 0, onComplete: function () {

                        done();
                        jQuery(element[0]).css("-webkit-transform", "");
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


window.app
    .animation('.invite-btn-animation', function () {

        return {

            /*
             * make sure to call the done() function when the animation is complete.
             */
            beforeAddClass: function (element, className, done) {

                if (className == 'ng-hide') {

                    TweenMax.fromTo("#users-container", 0.5, { bottom: "6rem"}, {  bottom: 0, delay: 0.2, onComplete: function () {

                    }});

                    TweenMax.fromTo(element, 0.5, { scale: 1}, {  scale: 0, onComplete: function () {
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


                    TweenMax.fromTo(element, 0.3, {scale: 0}, {scale: 1, onComplete: function () {
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


window.app.animation('.connect-content-animation', function () {
    return {
        enter: function (element, done) {
            TweenMax.fromTo(element, 0.5, { x: jQuery(element[0]).width()}, { x: 0, onComplete: function () {


                done();

            }});
        },

        leave: function (element, done) {
            TweenMax.fromTo(element, 0.5, { x: 0}, { x: -jQuery(element[0]).width(), onComplete: function () {

                done();

            }});
        }
    };
});