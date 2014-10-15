window.app.directive('renderChatMsg', ["$timeout", '$rootScope', '$location', 'RequestTypes', 'requests',

    function ($timeout, $rootScope, $location, RequestTypes, requests) {
        return {

            link: function ($scope, element, attrs) {

                String.prototype.escape = function () {

                    var tagsToReplace = {
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;'
                    };

                    return this.replace(/[&<>]/g, function (tag) {
                        return tagsToReplace[tag] || tag;
                    });

                };

                var pattern = /\[(.*?)\]/;
                var linkRegex = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
                var html = $scope.citem.message ? $scope.citem.message.escape() : "";
                var brPtrn = new RegExp("&lt;br&gt;", 'igm');
                html = html.replace(brPtrn, "<br>");
                var link = html.match(pattern);
                if (link) {
                    var data = link[1].split(",");
                    html = html.replace(pattern, '<a href="' + data[0] + '">' + data[1] + '</a>');
                }
                var links = html.match(linkRegex);
                if (links) {

                    for (var i = 0; i < links.length; i++) {
                        html = html.replace(links[i], '<a target="_blank" href="' + links[0] + '">' + links[i] + '</a>');
                    }

                }


                jQuery(element[0]).html(html);

            }
        };
    }
]);

