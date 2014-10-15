// These are so often used....

var h2b = Bitcoin.convert.hexToBytes,
    b2h = Bitcoin.convert.bytesToHex;

// Crypto primitives


function txParseHelloBlockUnspents(data, address) {
    // var r = JSON.parse(data);
    // var txs = r.unspent_outputs;
    var txs = JSON.parse(data);

    if (!txs)
        throw 'Not a helloblock format';

    delete unspenttxs;
    var unspenttxs = {};
    var balance = Bitcoin.BigInteger.ZERO;

    for (var i in txs) {
        var o = txs[i];
        var lilendHash = o.txHash;

        //convert script back to BBE-compatible text
        var script = dumpScript(new Bitcoin.Script(Bitcoin.convert.hexToBytes(o.scriptPubKey)));

        var value = new Bitcoin.BigInteger('' + o.value, 10);
        if (!(lilendHash in unspenttxs))
            unspenttxs[lilendHash] = {};
        unspenttxs[lilendHash][o.index] = {amount: value, script: script};
        balance = balance.add(value);
    }
    return {balance: balance, unspenttxs: unspenttxs};
}


var make_sending_transaction = function (utxo, to, value, change, fee, key) {

    if (!fee) fee = 10000;
    var sum = utxo.map(function (x) {
            return x.value;
        })
            .reduce(function (a, b) {
                return a + b;
            }, 0),
        outputs = [
            {
                address: to,
                value: value
            }
        ];
    if (value < 5430) {
        throw new Error("Amount below dust threshold!");
    }
    if (sum < value) {
        throw new Error("Not enough money!");
    }
    if (sum - value < fee) {
        throw new Error("Not enough to pay " + (fee / 100000000) + "BTC fee!");
    }

    //console.log("sum ", sum);
    // Split change in half by default so that the wallet has multiple UTXO at all times
    if (typeof change == "string") change = [change, change];

    //console.log("change ", change);
    //console.log("change ", Math.floor((sum - value) / 5430));
    //
    var changelen = Math.min(change.length, Math.floor((sum - value) / 5430));

    for (var i = 0; i < changelen; i++) {
        outputs.push({
            address: change[i],
            value: Math.floor((sum - value ) / changelen)
        });
    }

    //console.log("change ", outputs);

    var tx = new Bitcoin.Transaction({
        ins: utxo.map(function (x) {
            return x.output;
        }),
        outs: outputs
    });

    for (var i = 0; i < tx.ins.length; i++) {
        tx.sign(i, key);
    }

    var addFee = false;

    var value_weighted_sum = 0;

    for (var i = 0; i < utxo.length; i++) {
        value_weighted_sum = value_weighted_sum + utxo[i].value * utxo[i].confirmations;
    }

    //  console.log("value_weighted_sum befor divide", value_weighted_sum);
    console.log("in bytes", tx.serialize().length);


    value_weighted_sum = value_weighted_sum / ( tx.serialize().length );
    //console.log("value_weighted_sum", value_weighted_sum);
    var minOutpus = _.min(outputs, function (obj) {
        return obj.value
    });

    //  console.log("outputs ", outputs);
    //  console.log("minOutpus ", minOutpus);

    addFee = value_weighted_sum > 57600000 && minOutpus.value >= 1000000 && tx.serialize().length <= 1000 ? false : true;


    // console.log("value_weighted_sum > 57600000 ", value_weighted_sum > 57600000);
    // console.log("minOutpus.value >= 1000000 ", minOutpus.value >= 1000000);
    // console.log("tx.serialize().length <= 1000 ", tx.serialize().length <= 1000);

    if (addFee) {

        fee = 10000 * Math.ceil(tx.serialize().length / 1000);
        fee = fee < 100000 ? fee : 100000;
        console.log("fee", fee);

        changelen = Math.min(change.length, Math.floor((sum - value - fee) / 5430));

        outputs = [
            {
                address: to,
                value: value
            }
        ];

        for (var i = 0; i < changelen; i++) {
            outputs.push({
                address: change[i],
                value: Math.floor((sum - value - fee) / changelen)
            });
        }

        tx = new Bitcoin.Transaction({
            ins: utxo.map(function (x) {
                return x.output;
            }),
            outs: outputs
        });

        for (var i = 0; i < tx.ins.length; i++) {
            tx.sign(i, key);
        }


    }

    return  tx;
};

// Get sufficient unspent transaction outputs from a history set to
// spend a given amount of money

var get_enough_utxo_from_history = function (h, amount) {
    if (h.constructor != [].constructor) {
        var o = [];
        for (var v in h) o.push(h[v]);
        h = o;
    }
    var utxo = h.filter(function (x) {
        return !x.spend;
    });

    var valuecompare = function (a, b) {
        return a.value > b.value;
    };

    var high = utxo.filter(function (o) {
        return o.value >= amount;
    }).sort(valuecompare);

    if (high.length > 0) return [high[0]];
    utxo.sort(valuecompare);
    var totalval = 0;
    for (var i = 0; i < utxo.length; i++) {
        totalval += utxo[i].value;
        if (totalval >= amount) return utxo.slice(0, i + 1);
    }
    throw ("Not enough money to send funds including transaction fee. Have: " +
        (totalval ) + ", needed: " + (amount ));
};