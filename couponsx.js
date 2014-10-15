var crypto = require('crypto'),
    cp = require('child_process'),
    db = require('./db'),
    Facebook = require('facebook-node-sdk'),
    util = require('./util'),
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
                id: cId,
                isConsumed: false
            }, function (err, coupon) {

                //console.log("!!!!!!!!!!!!!!!!!", coupon);
                if (coupon) {

                    if (scope.user) {
                        scope.coupon = coupon;
                        cb2();
                    } else {
                        req.session.haveCoupon = true;
                        req.session.couponId = cId;
                        res.redirect('https://bitconnect.me/login');
                    }

                } else {

                    res.redirect('https://bitconnect.me/');
                }
            });


            //setter(scope, 'coupon', cb2)


        },
        function (cb2) {

            if (!scope.coupon) {
                res.redirect('https://bitconnect.me');
            } else {
                cb2();
            }

        },
        function (cb2) {

            db.Coupons.update({id: cId}, {$set: {
                isConsumed: true,
                consumedDate: new Date().getTime() / 1000,
                consumedBy: scope.user.id
            }});

            db.User.update({
                id: scope.user.id
            }, {
                $inc: {
                    tnx: (scope.coupon.units) || 0
                }
            });

            db.Request.insert({
                recipient: dumpUser(scope.user),
                sender: {
                    id: "123456thanx",
                    username: "123thanx.bitconnect.me",
                    address: "12thanx6bXb1ScDcDnHaGistMEVtYrjWMX"
                },//dumpUser("123456thanx"),
                id: util.randomHex(32),
                message: "coupon consume",
                tnx: scope.coupon.units,
                timestamp: new Date().getTime() / 1000,
                requestType: "buySat"
            }, cb2);

        }
    ], mkrespcb(res, 400, function () {

        res.redirect("https://bitconnect.me/app/chat/123456thanx");
    }));

});


module.exports = {
    consumeCoupon: consumeCoupon

};
