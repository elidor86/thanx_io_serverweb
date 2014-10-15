window.app
    .animation('.chat-animate', function () {

        return {
            enter: function (element, done) {


                var innerEl = jQuery(element);
                if (innerEl.length > 0) {

                    var container = jQuery('.content'),
                        scrollTo = jQuery('#scroll-to');

                    container.scrollTop(
                            scrollTo.offset().top - container.offset().top + container.scrollTop()
                    );

                    if (innerEl.hasClass("left-animation")) {
                        TweenMax.from(element, 0.5, {opacity: 0, x: -200, onComplete: function () {
                            done();
                        }});
                    } else {
                        TweenMax.from(element, 0.5, {opacity: 0, x: 200, onComplete: function () {
                            done();
                        }});
                    }
                    //
                }


            },

            leave: function (element, done) {
                var innerEl = jQuery(element);
                if (innerEl.length > 0) {


                    if (innerEl.hasClass("left-animation")) {
                        TweenMax.from(element, 0.5, {opacity: 0, x: 200, onComplete: function () {
                            done();
                        }});
                    } else {
                        TweenMax.from(element, 0.5, {opacity: 0, x: -200, onComplete: function () {
                            done();
                        }});
                    }
                    //
                }
            },

            move: function (element, done) {

            }
        }
    });
