window.app.service('Ddp', ['$rootScope', "$q",
    function ($rootScope, $q) {

        var DdpServices = {};

        var subs = {},
            isFirstTime = true,
            client = null,
            isConnected = false,
            reconnectCount = 0,
            watchers = {};


        subs['me'] = {name: "me", params: [profile.id]};
        subs['latestinteractions'] = {name: "latestinteractions", params: [profile.id]};


        DdpServices.isConnected = false;
        DdpServices.isConnected = false;

        var applyWatchers = function () {

            _.each(watchers, function (watch, key, list) {

                if (!client.watchers[watch.name]) {
                    client.watch(watch.name, function (doc, message) {
                        $rootScope.$broadcast("watch_" + watch.name, doc, message);
                    })
                }

            });

        };

        DdpServices.addWatch = function (name) {
            watchers[name] = {name: name};

            if (client) {
                client.watchers = {};
                applyWatchers();
            }
        };

        DdpServices.removeWatch = function (name) {
            delete  watchers[name];
            if (client) {

            }
        };

        DdpServices.addWatch('InvitationStatus');
        DdpServices.addWatch('myConversations');
        DdpServices.addWatch('user');
        DdpServices.addWatch('chat');

        var onConnect = function () {
            applyWatchers();
            _.each(subs, function (sub, key, list) {

                client.subscribe(sub.name, sub.params)
                    .done(function () {
                        console.log("Successfully sub to ", sub.name);
                        $rootScope.$broadcast('subscribeReady_' + sub.name);
                    })
                    .fail(function (err) {

                    });

            });
        };
        DdpServices.connect = function connect() {

            if (DdpClient && DdpClient.sock.readyState == 1) {
                client = DdpClient;
                isConnected = true;
                reconnectCount = 0;
                isFirstTime = false;
                onConnect();
            } else {
                DdpClient = new MeteorDdp(location.protocol + '//thanx.io/websocket');

                DdpClient.connect().done(function () {
                    client = DdpClient;

                    onConnect();
                    console.log('Connected!');
                });
            }
            //client = new MeteorDdp('https://thanx.io/websocket');


        };

        DdpServices.connect();

        DdpServices.call = function (name, params) {

            var deferred = $q.defer();

            // console.log("call to ", name);

            if (isConnected && client) {

                var promise = client.call(name, params);

                promise.done(function (data) {
                    deferred.resolve(data);
                });


            }
            else {
                deferred.reject();
            }

            // $rootScope.$broadcast('updateRequest', r);

            return deferred.promise;
        };

        DdpServices.subscribe = function (name, params) {

            var deferred = $q.defer();
            subs[name] = {name: name, params: params};
            // console.log("subscribe to ", name);

            if (isConnected) {
                client.subscribe(name, params)
                    .done(function () {
                        deferred.resolve();
                        $rootScope.$broadcast('subscribeReady_' + name);
                        console.log("Successfully subs to ", name);
                    })
                    .fail(function (err) {
                        deferred.reject();
                    });
            }
            else {
                deferred.reject();
            }

            // $rootScope.$broadcast('updateRequest', r);

            return deferred.promise;
        };

        DdpServices.unSubscribe = function (name) {
            delete  subs[name];
            client.unsubscribe(name);
        };


        jQuery(document).on("SockOnClose", function (event, CloseEvent) {


            console.log("SockOnClose", CloseEvent);
            if (CloseEvent.wasClean) {
                isConnected = false;
            }
            else {
                //reconnectCount
                var reconnect = setInterval(function () {
                    if (client.sock.readyState == 1) {
                        clearInterval(reconnect);
                        return;
                    }
                    /*else {
                     //if (reconnectCount >= 10)
                     console.log("numOfTry >= 10");
                     isConnected = false;
                     clearInterval(reconnect);
                     return;
                     }*/
                    DdpServices.connect();
                    reconnectCount = reconnectCount + 1;
                }, 3000);
            }

        });

        DdpServices.client = client;
        return DdpServices;
    }
]);