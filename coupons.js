var crypto = require('crypto'),
    cp = require('child_process'),
    db = require('./db'),
    Facebook = require('facebook-node-sdk'),
    util = require('./util'),
    ee = require("./events-emitter").event,
    async = require('async'),
    config = require('./config'),
    sha256 = function (x) {
        return crypto.createHash('sha256').update(x).digest('hex');
    };

var eh = util.eh,
    mkrespcb = util.mkrespcb,
    setter = util.cbsetter,
    pybtctool = util.pybtctool,
    FBify = util.FBify,
    dumpUser = util.dumpUser;

var consumeCoupon = FBify(function (profile, req, res) {

    // console.log("profile", profile);
    /// console.log("req", req);

    var cId = req.params.cId,
        scope = {};

    console.log("cId", cId);
    if (!cId)
        res.redirect('https://' + req.headers.host.split('.').slice(1, 3).join('.'));

    // console.log("profile", profile);

    req.session.haveCoupon = false;
    req.session.couponId = "";

    async.series([
        function (cb2) {

            db.User.findOne({
                id: profile.id
            }, setter(scope, 'user', cb2));


        }, function (cb2) {

            db.Coupons.findOne({
                id: cId
            }, function (err, coupon) {


                if (coupon) {

                    var id = scope.user ? scope.user.id : profile.id;
                    if (coupon.counter > 5 || coupon.consumedArr.indexOf(id) > -1) {

                        res.redirect('https://thanx.io/');
                        return;
                    }


                    if (scope.user) {
                        scope.coupon = coupon;
                        cb2();
                    } else {
                        req.session.haveCoupon = true;
                        req.session.couponId = cId;
                        res.redirect('https://thanx.io/login');
                    }

                } else {

                    res.redirect('https://thanx.io/');
                }
            });


            //setter(scope, 'coupon', cb2)


        },
        function (cb2) {

            if (!scope.coupon) {
                res.redirect('https://thanx.io');
            } else {
                cb2();
            }

        },
        function (cb2) {


            db.Coupons.update({id: cId},
                {
                    $set: {
                        isConsumed: true,
                        consumedDate: new Date().getTime() / 1000,
                        consumedBy: scope.user.id

                    },
                    $inc: { counter: 1 },
                    $push: {
                        "consumedArr": scope.user.id
                    }
                });


            db.User.update({
                id: scope.user.id
            }, {
                $inc: {
                    tnx: (scope.coupon.units) || 0
                }
            });

            db.Request.insert({
                recipient: dumpUser(scope.user),
                sender: config.superUser,//dumpUser("123456thanx"),
                id: util.randomHex(32),
                message: "coupon consume",
                tnx: scope.coupon.units,
                timestamp: new Date().getTime() / 1000,
                requestType: "buySat"
            }, cb2);

        }
    ], mkrespcb(res, 400, function () {

        res.redirect("https://thanx.io/app/chat/123456thanx");
    }));

});


var redeemCoupon = FBify(function (profile, req, res) {

    // console.log("profile", profile);
    /// console.log("req", req);


    var cId = req.param('coupon') || null,
        scope = {};

    console.log("cId", cId);
    console.log("profile", profile);

    if (!cId) {
        res.json({error: 'error'});
        return;
    }


    // console.log("profile", profile);

    req.session.haveCoupon = false;
    req.session.couponId = "";

    async.series([
        function (cb2) {

            db.User.findOne({
                id: profile.id
            }, setter(scope, 'user', cb2));


        }, function (cb2) {

            db.Coupons.findOne({
                id: cId
            }, function (err, coupon) {


                if (coupon) {

                    var id = scope.user ? scope.user.id : profile.id;
                    if (coupon.counter > 5 || coupon.consumedArr.indexOf(id) > -1) {

                        res.json({error: 'error'});
                        return;
                    }


                    if (scope.user) {
                        scope.coupon = coupon;
                        cb2();
                    } else {
                        req.session.haveCoupon = true;
                        req.session.couponId = cId;
                        res.redirect('https://thanx.io/login');
                    }

                } else {

                    res.json({error: 'coupon not valid'});
                }
            });


            //setter(scope, 'coupon', cb2)


        },
        function (cb2) {

            if (!scope.coupon) {
                res.json({error: 'error'});
            } else {
                cb2();
            }

        },
        function (cb2) {


            db.Coupons.update({id: cId},
                {
                    $set: {
                        isConsumed: true,
                        consumedDate: new Date().getTime() / 1000,
                        consumedBy: scope.user.id

                    },
                    $inc: { counter: 1 },
                    $push: {
                        "consumedArr": scope.user.id
                    }
                });


            db.User.update({
                id: scope.user.id
            }, {
                $inc: {
                    tnx: (scope.coupon.units) || 0
                }
            });

            db.User.findOne({
                id: scope.user.id
            }, function (err, user) {
                ee.emit('rawSend', [
                    {id: user.id, amount: user.tnx}
                ]);
            });

            scope.request = {
                recipient: dumpUser(scope.user),
                sender: config.superUser,//dumpUser("123456thanx"),
                id: util.randomHex(32),
                message: "coupon consume",
                tnx: scope.coupon.units,
                timestamp: new Date().getTime() / 1000,
                requestType: "buySat"
            };

            db.Request.insert(scope.request, cb2);

        }
    ], mkrespcb(res, 400, function () {

        ee.emit("newRequest", profile.id, scope.request);
        res.json({amount: scope.coupon.units});
    }));

});


module.exports = {
    consumeCoupon: consumeCoupon,
    redeemCoupon: redeemCoupon

};
