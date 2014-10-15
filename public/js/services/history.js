window.app.service('HistoryService', ['$http', '$rootScope', 'Ddp',
    function ($http, $rootScope, Ddp) {

        //console.log("HistoryService Start!!");

        var history,
            interactions = {},
            conversations;


        var self = this;

        this.conversationsDdp = {};


        this.setLocalStorage = function (key, value) {
            if (typeof(Storage) !== "undefined") {
                // Code for localStorage/sessionStorage.

                if (typeof (value) !== "string") {
                    value = JSON.stringify(value);
                    localStorage.setItem(key, value);
                }

            }
            else {
                // Sorry! No Web Storage support..
            }
            $rootScope.$safeApply();
        };

        this.getLocalStorage = function (key, doParse) {
            if (typeof(Storage) !== "undefined") {
                // Code for localStorage/sessionStorage.

                var val = localStorage.getItem(key);
                if (val) {
                    if (doParse) {
                        return JSON.parse(val);
                    } else {
                        return val;
                    }
                } else {
                    return {};
                }


            }
            else {
                // Sorry! No Web Storage support..
            }
            $rootScope.$safeApply();
        };

        this.conversationsDdp = self.getLocalStorage("conversationsDdp", true);


        this.getConversationsDdp = function () {
            return _.sortBy(self.conversationsDdp, function (item) {
                return -item.timestamp;
            });
        };

        self.have = 0;
        var isFirstTime = true;

        var goToId = null;
        var scrollTo = function (el) {
            var container = jQuery('.content'),
                scrollTo = jQuery('#' + el);

            if (scrollTo.offset()) {
                container.scrollTop(
                        scrollTo.offset().top - container.offset().top + container.scrollTop()
                );
            }
        };

        $rootScope.$on('subscribeReady_latestinteractions', function (scope) {
            console.log("subscribeReady_latestinteractions");

            self.conversationsDdp = Ddp.client.getCollection("myConversations");
            if (!self.conversationsDdp)
                self.conversationsDdp = {};

            if (!isFirstTime && goToId) {
                scrollTo(goToId);
            }

            isFirstTime = false;
            self.have = _.size(self.conversationsDdp);

            console.log("subscribeReady_latestinteractions have", self.have);

            self.setLocalStorage("conversationsDdp", self.conversationsDdp);
            $rootScope.$safeApply();
        });

        this.loadMore = function () {

            //console.log("latestinteractions loadMore");
            //console.log(Ddp.client.getCollection("counters").latestinteractions.count);
            try {
                if (self.have == Ddp.client.getCollection("counters").latestinteractions.count)
                    return;

                var keys = Object.keys(self.conversationsDdp);
                goToId = self.conversationsDdp[keys[keys.length - 1]].id;

                Ddp.unSubscribe('latestinteractions');
                Ddp.subscribe('latestinteractions', [profile.id, self.have]);
            } catch (err) {
                //  console.log("err", err);
            }

        };

        $rootScope.$on('watch_myConversations', function (scope, Conversation, message) {
            // console.log("latestinteractions changedDoc", Conversation);
            // console.log("latestinteractions message", message);


            if (message == "added" || message == "changed") {
                self.conversationsDdp[Conversation._id] = Conversation;
            }
            self.setLocalStorage("conversationsDdp", self.conversationsDdp);
            $rootScope.$safeApply();
        });


        this.getHistory = function getHistory(cb) {
            $http.get('/rawhistory').success(function (h) {
                history = h;
                cb(h);
            });
        };

        this.getCachedHistory = function getCachedHistory() {
            if (history)
                return history;
            return null;
        };

        this.getHistoryItem = function getHistoryItem(id, cb) {
            var result,
                that = this,
                /**
                 *   Find the item in the cached history object.
                 *   Calls the callback and returns true if item was found, returns false otherwise.
                 */
                findHistoryItem = function findHistoryItem() {
                    result = jQuery.grep(history, function (item) {
                        return item.id == id;
                    });
                    if (result[0]) {
                        cb(result[0]);
                        return true;
                    }
                    return false;
                };
            if (!history) {
                // no history is cached - go to server
                this.getHistory(findHistoryItem);
            } else if (!findHistoryItem()) {
                // history is cached but specific item not found
                this.getHistory(findHistoryItem);
            }
        };

        this.getInteractionWithUser = function getInteractionWithUser(otherUserId, cb) {
            $http.get('/interaction?otherUserId=' + otherUserId).success(function (result) {
                interactions[otherUserId] = result;
                cb(null, result);
            }).error(function (err) {
                cb(err);
            });
        };

        this.getCachedInteractionWithUser = function getCachedInteractionWithUser(otherUserId, cb) {
            if (interactions[otherUserId]) {
                return interactions[otherUserId];
            }
            return null;
        };

        this.getConversations = function getConversations(cb) {
            $http.get('/latestinteractions').success(function (result) {
                conversations = result;
                cb(null, result);
            }).error(function (err) {
                cb(err);
            });
        };

        this.getCachedConversations = function getCachedConversations() {
            return conversations || null;
        }
    }
]);