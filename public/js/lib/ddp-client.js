DdpClient = null;

DDP = {};

DDP.AutosubsArr = [];
DDP.isFirstTime = true;
DDP.reconnectCount = 0;
DDP.watchers = null;

DDP.connect = function () {
    DdpClient = new MeteorDdp('https://thanx.io/websocket');
    DdpClient.connect()
        .done(function () {
            DDP.reconnectCount = 0;
            if (DDP.isFirstTime) {
                // angular.bootstrap(document, ['thanxbits']);
            }

            if (DDP.watchers)
                DdpClient.watchers = DDP.watchers;

            _.each(DDP.AutosubsArr, function (sub, key, list) {

                DdpClient.subscribe(sub.name, sub.params)
                    .done(function () {
                        console.log("Successfully sub to ", sub.name);
                    })
                    .fail(function (err) {

                    });
            });

            DDP.isFirstTime = false;

        }).fail(function () {


        });
};


DDP.AutosubsArr.push({name: "me", params: [profile.id]});

DDP.connect();


