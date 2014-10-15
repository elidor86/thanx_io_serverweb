var db = require('./db'),
    util = require('./util'),
    config = require('./config'),
    ee = require("./events-emitter").event,
    async = require('async'),
    _ = require('underscore'),
    https = require('https'),
    tnx = require('./tnx'),
    Push = require('./pushnotify'),
    Promise = require("node-promise").Promise,
    Bitcoin = require('bitcoinjs-lib'),
    request = require('request');
constants = require('./constants');

var helloblock = require('helloblock-js')({
    network: 'mainnet'
});

var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;

var m = module.exports = {};

WebSocketClient = require('websocket').client;

var isInDb = function (tx) {
    var promise = new Promise();

    db.Request.find({
        txid: tx.txHash
    }, function (err, courser) {

        courser.nextObject(function (err, doc) {
            if (doc) {
                promise.resolve({isInDb: true, tx: tx});
            } else {
                promise.resolve({isInDb: false, tx: tx});
            }

        });
    });


    return promise;
};

var processTransaction = function (address) {

    var options = {
        url: 'https://mainnet.helloblock.io/v1/addresses/' + address + '/transactions',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'
        }
    };


    request(options, function (error, response, body) {
        // console.log("error ", error);
        //  console.log("response ", response);
        // console.log("body ", body);

        if (!error && response.statusCode == 200) {

            body = JSON.parse(body);

            var transactions = body.status == "success" ? body.data.transactions : [];


            for (var i = 0; i < transactions.length; i++) {

                var tx = transactions[i];

                //console.log("tx 1 ", tx.txHash);

                isInDb(tx).then(function (res) {

                    if (res.isInDb) {
                        // console.log("res.isInDb ", res.isInDb);
                        return;
                    }

                    //return;

                    var tx = res.tx;
                    var scope = {};

                    var inputs = tx.inputs, outputs = tx.outputs;

                    var senderAddress = inputs ? inputs[0].address : null;
                    var recipientAddress = null;
                    var value = Math.abs(tx.estimatedTxValue);


                    var requestType;
                    requestType = constants.RequestTypes.GIVE;
                    //  requestType = constants.RequestTypes.GIVE;

                    for (var i = 0; i < outputs.length; i++) {
                        if (outputs[i].address == address) {
                            recipientAddress = outputs[i].address;
                            break;
                        } else if (outputs[i].address != senderAddress) {
                            recipientAddress = outputs[i].address;
                        }
                    }


                    async.series([
                        function (cb2) {
                            db.User.findOne({
                                address: senderAddress
                            }, function (err, user) {
                                // console.log("user ", user);
                                if (user) {
                                    scope.sender = user;
                                }
                                cb2();
                            });
                        },
                        function (cb2) {
                            db.User.findOne({
                                address: recipientAddress
                            }, function (err, user) {
                                // console.log("recipientAddress ", user);
                                if (user) {
                                    scope.recipient = user;
                                }
                                cb2();
                            });

                        }

                    ], function () {

                        scope.request = {
                            flag: 'fromOutSide',
                            sender: scope.sender ? dumpUser(scope.sender) : senderAddress,
                            recipient: scope.recipient ? dumpUser(scope.recipient) : recipientAddress,
                            id: util.randomHex(32),
                            sat: value,
                            txid: tx.txHash,
                            confirmed: false,
                            message: "",
                            timestamp: new Date().getTime() / 1000,
                            requestTimestamp: new Date().getTime() / 1000,
                            requestType: requestType
                        };

                        console.log("err ", scope.request);

                        db.Request.insert(scope.request, function (err, id) {
                            ee.emit("newRequest", null, scope.request);

                            console.log("err ", err);
                            console.log("id ", id);
                        });

                    });
                    console.log("res ", res.hash);
                });


            }


        }
    });
};

var updateOutSideTransaction = function () {

    ///console.log("updateOutSideTransaction ");

    db.User.find({address: { $exists: true }}).toArray(function (err, arr) {

        for (var i = 0; i < arr.length; i++) {

            //  if (arr[i].address !== "1Fq98jGg1iB48HGYgtmVCaX8mkGLgMFAH3")
            //continue;

            processTransaction(arr[i].address);


        }
    });


};

//(updateOutSideTransaction, 3000);
setInterval(updateOutSideTransaction, 1000 * 20);


m.fetchHeight = function (req, res) {
    pybtctool('last_block_height', mkrespcb(res, 400, function (x) {
        res.json(parseInt(x));
    }));
};

m.updateBTCTxs = function (cb) {
    var q = {
        $or: [
            {
                confirmed: false
            },
            {
                confirmed: { $lte: 6 }
            }
        ]
    };

    db.Request.find(q)
        .toArray(eh(cb, function (txs) {


            // console.log("txs length ", txs.length);
            async.map(txs, function (tx, cb2) {
                //console.log("tx ", tx);
                if (tx.txid) {
                    helloblock.transactions.get(tx.txid, function (err, resp, resource) {

                        if (!err && resp.status == 'success') {

                            var confirmations = resp.data.transaction.confirmations;

                            //  console.log("txs confirmations ", tx.confirmed);
                            //  console.log(" confirmations ", confirmations);
                            // console.log(" tx.txid ", tx.txid);
                            //  console.log(" resp.data.transaction. ", resp.data.transaction.txHash);


                            // console.log("Request", tx);

                            var msg = null;

                            // console.log("res", res);
                            if (tx.isTnxPending && tx.requestType == "buyTnx" && confirmations > 0) {
                                msg = "the transaction have confirmed and your account balance has update";


                                db.User.update({
                                    id: tx.sender.id
                                }, {
                                    $inc: {
                                        tnx: (tx.sat) || 0
                                    }
                                });

                                db.User.findOne({
                                    id: tx.sender.id
                                }, function (err, user) {
                                    ee.emit('rawSend', [
                                        {id: user.id, amount: user.tnx}
                                    ]);
                                });

                            } else if (tx.requestType == "buySat" && confirmations > 0) {
                                msg = "the transaction have confirmed and your bitcoin account balance has update";
                            }

                            var updateObj = {
                                confirmed: confirmations,
                                isTnxPending: false
                            };

                            if (msg) {
                                updateObj['message'] = msg;
                            }

                            db.Request.update({
                                txid: tx.txid
                            }, {
                                $set: updateObj
                            }, function () {

                            });

                            db.Request.findOne({
                                id: tx.txid
                            }, function (err, request) {
                                if (!err && request) {
                                    ee.emit("updateRequest", null, request);
                                }
                                cb2();
                            });

                        }


                        /*

                         console.log("resp ", resp);
                         console.log("err ", err);
                         console.log("resource ", resource);*/

                    });

                }


            }, cb || function () {
            });
        }));
};

setTimeout(function () {
    // m.updateBTCTxs();
}, 3000);


m.sendBTC = FBify(function (profile, req, res) {

    var tx = req.param('tx'),
        to = req.param('to') || '',
        requestId = req.param('requestId'),
        message = req.param('message'),
        txObj = tx ? Bitcoin.Transaction.deserialize(tx) : null,
        txHash = tx ? Bitcoin.convert.bytesToHex(txObj.getHash()) : null,
        scope = {};

    async.series([

        function (cb2) {
            db.User.findOne({
                id: profile.id
            }, setter(scope, 'from', cb2));
        },
        function (cb2) {
            if (!scope.from) return res.json('user not found', 403);
            if (to.indexOf('.') >= 0)
                db.User.findOne({
                    username: to
                }, setter(scope, 'to', cb2));
            else setter(scope, 'to', cb2)(null, {
                address: to
            });
        },
        function (cb2) {
            console.log('pushing', tx);

            pybtctool('pushtx', tx, setter(scope, 'result', function (err, res) {
                if (!err) {
                    cb2(null, res);
                } else {
                    cb2(err.stack);
                }
            }));

            /*
             helloblock.transactions.propagate(tx, function (err, res, tx) {
             if (err) {
             console.log("err helloblock.transactions.propagate", err);
             console.log("err helloblock.transactions.propagate", res);
             cb2(err);
             } else {
             console.log('SUCCESS:', tx);
             cb2(null, res);
             }


             });*/

            /*
             pybtctool('pushtx', tx, setter(scope, 'result', function (err, res) {
             if (!err) {
             cb2(null, res);
             } else {
             cb2(err.stack);
             }
             }));*/
        },
        function (cb2) {
            if (!requestId) {
                cb2();
            }
            db.Request.findAndModify({
                id: requestId,
                $or: [
                    {
                        'sender.id': profile.id
                    },
                    {
                        'recipient.id': profile.id
                    }
                ]
            }, {}, {}, {
                remove: true
            }, setter(scope, 'deletedRequest', cb2));
        },
        function (cb2) {
            var txType;
            var requestType;
            scope.satsent = 0;
            txObj.outs.map(function (o) {
                if (o.address == scope.to.address) scope.satsent += o.value;
            });
            if (!scope.deletedRequest || scope.deletedRequest.requestType === constants.RequestTypes.GIVE) {
                txType = constants.TxTypes.giveRequest;
                requestType = constants.RequestTypes.GIVE;
            }
            else if (scope.deletedRequest.requestType === constants.RequestTypes.GET) {
                txType = constants.TxTypes.getRequest;
                requestType = constants.RequestTypes.GET;

            }
            var currentTimestamp = new Date().getTime() / 1000;

            db.Transaction.insert({
                payer: dumpUser(scope.from),
                payee: scope.to.id ? dumpUser(scope.to) : scope.to.address,
                id: util.randomHex(32),
                sat: scope.satsent,
                txid: txHash,
                confirmed: false,
                message: message,
                timestamp: currentTimestamp,
                requestTimestamp: scope.deletedRequest ? scope.deletedRequest.timestamp : currentTimestamp,
                txType: txType
            }, null);

            scope.request = {
                sender: dumpUser(scope.from),
                recipient: scope.to.id ? dumpUser(scope.to) : scope.to.address,
                id: util.randomHex(32),
                sat: scope.satsent,
                txid: txHash,
                confirmed: false,
                message: message,
                timestamp: currentTimestamp,
                requestTimestamp: scope.deletedRequest ? scope.deletedRequest.timestamp : currentTimestamp,
                requestType: requestType
            };

            db.Request.insert(scope.request, cb2);
        },
        function (cb2) {
            if (scope.deletedRequest) {
                scope.deletedRequest.timestamp = new Date().getTime() / 1000;
                db.RequestArchive.insert(scope.deletedRequest);
            }
            if (scope.to.id) {
                var token = req.facebook.getApplicationAccessToken(),
                    amount = scope.satsent + " satoshi",
                    msg = profile.first_name + ' sent you ' + amount + '.';

                var apnToken = scope.to.ApnToken;
                var gcmToken = scope.to.GcmToken;

                Push.sendNotification(apnToken, gcmToken, {otherUserId: profile.id}, msg);


                req.facebook.api('/' + scope.to.id + '/notifications', 'POST', {
                    access_token: token,
                    template: msg,
                    href: '?src=confirmGive&userId=' + profile.id
                }, function () {

                });
            }
            cb2();
        }
    ], mkrespcb(res, 400, function () {
        ee.emit("newRequest", null, scope.request);
        res.json(scope.request);
    }));
});


m.getAddressOutputs = function (req, res) {

    /*
     https.get('https://btc.blockr.io/api/v1/address/balance/' + req.param('address'), function (r) {
     var d = '';
     r.on('data', function (chunk) {
     d += chunk;
     });
     r.on('end', function () {
     try {

     return res.json(JSON.parse(d));
     } catch (e) {
     res.json(e, 400);
     }
     });
     r.on('error', function (e) {
     res.json(e, 400);
     });
     });*/

    /*
     https.get('https://blockchain.info/unspent?active=' + req.param('address'), function (r) {
     var d = '';
     r.on('data', function (chunk) {
     d += chunk;
     });

     r.on('end', function () {
     try {
     //  console.log("end", d);
     if (d == "No free outputs to spend") {
     //  console.log("No free o");
     return res.json([]);
     } else {
     return res.json(JSON.parse(d).unspent_outputs);
     }

     } catch (e) {
     res.json(e, 400);
     }
     });

     r.on('error', function (e) {
     console.log("error", e);
     res.json(e, 400);
     });
     });*/


    pybtctool('history', req.param('address'), mkrespcb(res, 400, function (h) {
        res.json(JSON.parse(h));
    }));

};

m.getThanxAddress = function (req, res) {
    res.json({
        address: config.thanxAddress
    });
};


m.buyTNX = FBify(
    function (profile, req, res) {
        var tx = req.param('tx');
        if (!tx)
            return res.json('need tx', 400);
        var tnx = req.param('tnx') || 0,
            txObj = tx ? Bitcoin.Transaction.deserialize(tx) : null,
            txHash = tx ? Bitcoin.convert.bytesToHex(txObj.getHash()) : null,
            scope = {};


        //  console.log("tnx", tnx);
        // console.log("tx", tx);
        // console.log("txObj", txObj);
        // console.log("profile", profile);


        async.series([

            function (cb2) {
                scope.purchase = 0;
                txObj.outs.map(function (o) {
                    if (o.address.toString() == config.thanxAddress) scope.purchase += o.value;
                });
                if (scope.purchase === 0)
                    return res.json('must purchase something!', 400);
                db.User.findOne({
                    id: profile.id
                }, setter(scope, 'from', cb2));
            },
            function (cb2) {
                if (!scope.from) return res.json('user not found', 403);
                // if (scope.purchase + scope.from.tnx < tnx) return res.json('not enough tnx', 400);
                console.log('pushing', tx);
                if (tx) pybtctool('pushtx', tx, setter(scope, 'result', cb2));
                else cb2();
            },
            function (cb2) {

                cb2();

                /*
                 db.User.update({
                 id: scope.from.id
                 }, {
                 $set: {
                 tnx: (scope.from.tnx + scope.purchase - tnx) || 0
                 }
                 }, cb2);*/
            },
            function (cb2) {

                scope.request = {
                    sender: dumpUser(scope.from),
                    recipient: config.superUser,
                    id: util.randomHex(32),
                    message: 'waitnig for one confirmation for purchase of ' + scope.purchase + " tnx",
                    sat: scope.purchase,
                    txid: txHash,
                    confirmed: false,
                    isTnxPending: true,
                    timestamp: new Date().getTime() / 1000,
                    requestType: "buyTnx"
                };

                db.Request.insert(scope.request, cb2);


                /*
                 db.Transaction.insert({
                 payer: dumpUser(scope.from),
                 payee: 'thanxbits',
                 id: util.randomHex(32),
                 sat: scope.purchase,
                 txid: txHash,
                 confirmed: false,
                 timestamp: new Date().getTime() / 1000
                 }, cb2);*/

            }
        ], mkrespcb(res, 400, function () {
            ee.emit("newRequest", null, scope.request);
            res.json('success');
        }));


    });

m.buySat = FBify(function (profile, req, res) {

    var https = require('https');

    var amount = req.param('amount');
    var scope = {};


    console.log("amount", amount);
    // console.log("tx", tx);
    // console.log("txObj", txObj);
    // console.log("profile", profile);


    async.series([

        function (cb2) {
            scope.purchase = amount;

            return res.json('in beta', 400);


            if (scope.purchase === 0)
                return res.json('must purchase something!', 400);
            db.User.findOne({
                id: profile.id
            }, setter(scope, 'from', cb2));
        },
        function (cb2) {
            if (!scope.from) return res.json('user not found', 403);
            if (!scope.from.verified) return res.json('user not verified', 403);
            if (scope.from.tnx - amount - 1000 < 0) return res.json('not enough tnx', 400);

            // if (scope.purchase + scope.from.tnx < tnx) return res.json('not enough tnx', 400);

            var path =
                "/merchant/5b214097-9056-4d80-a258-7ceff1dcdbc3/payment?" +
                "password=" + encodeURIComponent(config.blockChain.password) +
                "&second_password=" + encodeURIComponent(config.blockChain.second_password) +
                "&to=" + scope.from.address +
                "&amount=" + scope.purchase +
                "&from=" + config.superUser.address +
                "&fee=" + 10000;


            var options = {
                hostname: 'blockchain.info',
                port: 443,
                path: path,
                method: 'GET', headers: {
                    accept: '*/*'
                }
            };

            var req = https.request(options, function (res) {
                // console.log("statusCode: ", res);

                var response = '';

                res.on('data', function (d) {
                    // console.log("d: ", d);
                    response += d;
                });

                res.on('end', function () {
                    response = response.toString();
                    console.log(response);
                    scope.response = JSON.parse(response);
                    cb2();
                });

            });

            req.end();

            req.on('error', function (e) {
                console.log('error', e);
                res.json('error', 400);
            });

        },
        function (cb2) {

            // cb2();

            if (scope.response && !scope.response.error && scope.response.tx_hash) {
                db.User.update({
                    id: scope.from.id
                }, {
                    $inc: {
                        tnx: -(scope.purchase + 10000) || 0
                    }
                }, cb2);
            } else {
                res.json('error', 400);
            }
            /*
             */
        },
        function (cb2) {

            //cb2();

            if (scope.response && !scope.response.error && scope.response.tx_hash) {

                scope.request = {
                    recipient: dumpUser(scope.from),
                    sender: config.superUser,
                    id: util.randomHex(32),
                    message: 'thanks for buy  ' + scope.purchase + " sathoshi",
                    sat: scope.purchase,
                    txid: scope.response.tx_hash,
                    confirmed: false,
                    timestamp: new Date().getTime() / 1000,
                    requestType: "buySat"
                };

                db.Request.insert(scope.request, cb2);

            } else {
                res.json('error', 400);
            }

            /*
             */

            /*
             db.Transaction.insert({
             payer: dumpUser(scope.from),
             payee: 'thanxbits',
             id: util.randomHex(32),
             sat: scope.purchase,
             txid: txHash,
             confirmed: false,
             timestamp: new Date().getTime() / 1000
             }, cb2);*/

        }
    ], mkrespcb(res, 400, function () {
        ee.emit("newRequest", null, scope.request);
        res.json('success');
    }));


});


// Submit your address

m.submitAddress = FBify(function (profile, req, res) {
    db.User.findOne({
        id: profile.id
    }, mkrespcb(res, 400, function (u) {
        if (!u) return res.json('user not found', 403);
        if (u.address && u.address != req.param('address')) {
            return res.json('incorrect password', 400);
        } else db.User.update({
            id: profile.id
        }, {
            $set: {
                address: req.param('address')
            }
        }, mkrespcb(res, 400, function () {
            res.json('success');
        }));
    }));
});

var price = 0,
    lastChecked = 0;

m.price = function (req, res) {
    var now = new Date().getTime() / 1000;
    if (now < lastChecked + 60)
        return res.json(price);
    https.get('https://coinbase.com/api/v1/prices/buy', function (r) {
        var d = '';
        r.on('data', function (chunk) {
            d += chunk;
        });
        r.on('end', function () {
            try {
                price = parseFloat(JSON.parse(d).amount);
                lastChecked = new Date().getTime() / 1000;
                return res.json(price);
            } catch (e) {
                res.json(e, 400);
            }
        });
        r.on('error', function (e) {
            res.json(e, 400);
        });
    });
};


var bHeight = 0,
    lastCheckedBlockHeight = 0;


m.getBlockHeight = function () {
    var promise = new Promise();

    var now = new Date().getTime() / 1000;
    /*if (now < lastCheckedBlockHeight + 10) {

     // console.log("do not need https", bHeight);
     promise.resolve(bHeight);
     return promise;
     // return promise;
     }*/

    https.get('https://blockchain.info/latestblock', function (r) {

        var d = '';

        r.on('data', function (chunk) {
            d += chunk;
        });

        r.on('end', function () {
            try {
                var resObj = JSON.parse(d);
                bHeight = resObj.height;
                m.updateBTCTxs();
            //    console.log("blockchain.info/latestblock bHeight ", bHeight);
                lastCheckedBlockHeight = new Date().getTime() / 1000;
                promise.resolve(bHeight);
            } catch (e) {
                console.log("https.get err", e)

            }
        });

        r.on('error', function (e) {
            console.log("https.get err", e)
        });
    });

    return promise;
};

//wsUrl = 'wss://ws.biteasy.com/blockchain/v1';
wsUrl = 'ws://socket.blockcypher.com/v1/btc/main';

biteasy_client = new WebSocketClient();

biteasy_client.on('connect', function (connection) {
    console.log('WebSocket client connected');
    //observeUsers();
    connection.send(JSON.stringify({
        "event": "new-block"
    }));


    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });

    connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
        biteasy_client.connect(wsUrl);
        //client.connect(wsUrl);
    });


    var setBlockHeight = function (data) {

        if (!data)
            return;

        bHeight = data.height;
        console.log("bHeight: ", bHeight);

    };

    connection.on('message', function (message) {
        console.log("biteasy_client message: ", message);


        var obj = null;
        try {
            obj = JSON.parse(message);
        } catch (err) {

            console.log("err on message : ", err);
        }

        if (!obj)
            return;

        // console.log("Received: ", obj);

        bHeight = obj.height;
        m.updateBTCTxs();

        if (message.type === 'utf8') {



            // console.log("Received: ", obj);

            //bHeight
            //processTx(obj);


            //
        }

    });


});


//biteasy_client.connect(wsUrl);

m.getBlockHeight();
setInterval(m.getBlockHeight, 1000 * 60 * 5);
