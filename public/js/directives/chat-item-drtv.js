window.app.directive('chatItem', ["$timeout", '$rootScope', '$location', 'RequestTypes', 'requests',

    function ($timeout, $rootScope, $location, RequestTypes, requests) {
        return {

            link: function ($scope, element, attrs) {

                // console.log("adding chat Element!!!", $scope);


                $scope.$watch('$index', function (scope, Conversation, message) {
                    //console.log("$scope $index", $scope.$index);
                });

                if (attrs.index >= 2) {

                    var time1 = $scope.$parent.interactions1[attrs.index].timestamp;
                    var time2 = $scope.$parent.interactions1[attrs.index - 1].timestamp;


                    var absDiff = Math.abs(time2 - time1);

                    console.log("absDiff", absDiff);

                    if (absDiff > 1000 * 60 * 60) {
                        jQuery('#chat-container').append('<div class="time-line">' + moment.format(time1) + '</div>');
                    }
                    //time-line
                }


                if ($scope.$parent && !$scope.$parent.pagingData.initializing && $scope.$last) {
                    var content = jQuery('.content'),
                        chatContainer = jQuery('#chat-container');

                    content.scrollTop(
                            chatContainer.height() + content.height()
                    );
                }

                if ($scope.citem.isNew) {

                    jQuery(element[0]).addClass("chat-animate");
                    jQuery(element[0]).addClass("chat-item-animate");
                    if ($scope.citem.direction == "incoming") {
                        jQuery(element[0]).addClass("left-animation");
                    } else {
                        jQuery(element[0]).addClass("right-animation");
                    }


                }


            }
        };
    }
]);

