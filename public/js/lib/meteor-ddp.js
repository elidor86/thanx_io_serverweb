/* MeteorDdp - a client for DDP version pre1 */

//////////////////////////////////////////////////
// Package docs at http://docs.meteor.com/#deps //
//////////////////////////////////////////////////

Deps = {};

// http://docs.meteor.com/#deps_active
Deps.active = false;

// http://docs.meteor.com/#deps_currentcomputation
Deps.currentComputation = null;

var setCurrentComputation = function (c) {
    Deps.currentComputation = c;
    Deps.active = !!c;
};

// _assign is like _.extend or the upcoming Object.assign.
// Copy src's own, enumerable properties onto tgt and return
// tgt.
var _hasOwnProperty = Object.prototype.hasOwnProperty;

var _assign = function (tgt, src) {
    for (var k in src) {
        if (_hasOwnProperty.call(src, k))
            tgt[k] = src[k];
    }
    return tgt;
};

var _debugFunc = function () {
    // lazy evaluation because `Meteor` does not exist right away
    return (typeof Meteor !== "undefined" ? Meteor._debug :
        ((typeof console !== "undefined") && console.log ?
            function () {
                console.log.apply(console, arguments);
            } :
            function () {
            }));
};

var _throwOrLog = function (from, e) {
    if (throwFirstError) {
        throw e;
    } else {
        _debugFunc()("Exception from Deps " + from + " function:",
                e.stack || e.message);
    }
};

// Like `Meteor._noYieldsAllowed(function () { f(comp); })` but shorter,
// and doesn't clutter the stack with an extra frame on the client,
// where `_noYieldsAllowed` is a no-op.  `f` may be a computation
// function or an onInvalidate callback.
var callWithNoYieldsAllowed = function (f, comp) {
    if ((typeof Meteor === 'undefined')) {
        f(comp);
    } else {
        Meteor._noYieldsAllowed(function () {
            f(comp);
        });
    }
};

var nextId = 1;
// computations whose callbacks we should call at flush time
var pendingComputations = [];
// `true` if a Deps.flush is scheduled, or if we are in Deps.flush now
var willFlush = false;
// `true` if we are in Deps.flush now
var inFlush = false;
// `true` if we are computing a computation now, either first time
// or recompute.  This matches Deps.active unless we are inside
// Deps.nonreactive, which nullfies currentComputation even though
// an enclosing computation may still be running.
var inCompute = false;
// `true` if the `_throwFirstError` option was passed in to the call
// to Deps.flush that we are in. When set, throw rather than log the
// first error encountered while flushing. Before throwing the error,
// finish flushing (from a finally block), logging any subsequent
// errors.
var throwFirstError = false;

var afterFlushCallbacks = [];

var requireFlush = function () {
    if (!willFlush) {
        setTimeout(Deps.flush, 0);
        willFlush = true;
    }
};

// Deps.Computation constructor is visible but private
// (throws an error if you try to call it)
var constructingComputation = false;

//
// http://docs.meteor.com/#deps_computation
//
Deps.Computation = function (f, parent) {
    if (!constructingComputation)
        throw new Error(
            "Deps.Computation constructor is private; use Deps.autorun");
    constructingComputation = false;

    var self = this;

    // http://docs.meteor.com/#computation_stopped
    self.stopped = false;

    // http://docs.meteor.com/#computation_invalidated
    self.invalidated = false;

    // http://docs.meteor.com/#computation_firstrun
    self.firstRun = true;

    self._id = nextId++;
    self._onInvalidateCallbacks = [];
    // the plan is at some point to use the parent relation
    // to constrain the order that computations are processed
    self._parent = parent;
    self._func = f;
    self._recomputing = false;

    var errored = true;
    try {
        self._compute();
        errored = false;
    } finally {
        self.firstRun = false;
        if (errored)
            self.stop();
    }
};

_assign(Deps.Computation.prototype, {

    // http://docs.meteor.com/#computation_oninvalidate
    onInvalidate: function (f) {
        var self = this;

        if (typeof f !== 'function')
            throw new Error("onInvalidate requires a function");

        if (self.invalidated) {
            Deps.nonreactive(function () {
                callWithNoYieldsAllowed(f, self);
            });
        } else {
            self._onInvalidateCallbacks.push(f);
        }
    },

    // http://docs.meteor.com/#computation_invalidate
    invalidate: function () {
        var self = this;
        if (!self.invalidated) {
            // if we're currently in _recompute(), don't enqueue
            // ourselves, since we'll rerun immediately anyway.
            if (!self._recomputing && !self.stopped) {
                requireFlush();
                pendingComputations.push(this);
            }

            self.invalidated = true;

            // callbacks can't add callbacks, because
            // self.invalidated === true.
            for (var i = 0, f; f = self._onInvalidateCallbacks[i]; i++) {
                Deps.nonreactive(function () {
                    callWithNoYieldsAllowed(f, self);
                });
            }
            self._onInvalidateCallbacks = [];
        }
    },

    // http://docs.meteor.com/#computation_stop
    stop: function () {
        if (!this.stopped) {
            this.stopped = true;
            this.invalidate();
        }
    },

    _compute: function () {
        var self = this;
        self.invalidated = false;

        var previous = Deps.currentComputation;
        setCurrentComputation(self);
        var previousInCompute = inCompute;
        inCompute = true;
        try {
            callWithNoYieldsAllowed(self._func, self);
        } finally {
            setCurrentComputation(previous);
            inCompute = false;
        }
    },

    _recompute: function () {
        var self = this;

        self._recomputing = true;
        try {
            while (self.invalidated && !self.stopped) {
                try {
                    self._compute();
                } catch (e) {
                    _throwOrLog("recompute", e);
                }
                // If _compute() invalidated us, we run again immediately.
                // A computation that invalidates itself indefinitely is an
                // infinite loop, of course.
                //
                // We could put an iteration counter here and catch run-away
                // loops.
            }
        } finally {
            self._recomputing = false;
        }
    }
});

//
// http://docs.meteor.com/#deps_dependency
//
Deps.Dependency = function () {
    this._dependentsById = {};
};

_assign(Deps.Dependency.prototype, {
    // http://docs.meteor.com/#dependency_depend
    //
    // Adds `computation` to this set if it is not already
    // present.  Returns true if `computation` is a new member of the set.
    // If no argument, defaults to currentComputation, or does nothing
    // if there is no currentComputation.
    depend: function (computation) {
        if (!computation) {
            if (!Deps.active)
                return false;

            computation = Deps.currentComputation;
        }
        var self = this;
        var id = computation._id;
        if (!(id in self._dependentsById)) {
            self._dependentsById[id] = computation;
            computation.onInvalidate(function () {
                delete self._dependentsById[id];
            });
            return true;
        }
        return false;
    },

    // http://docs.meteor.com/#dependency_changed
    changed: function () {
        var self = this;
        for (var id in self._dependentsById)
            self._dependentsById[id].invalidate();
    },

    // http://docs.meteor.com/#dependency_hasdependents
    hasDependents: function () {
        var self = this;
        for (var id in self._dependentsById)
            return true;
        return false;
    }
});

_assign(Deps, {
    // http://docs.meteor.com/#deps_flush
    flush: function (_opts) {
        // XXX What part of the comment below is still true? (We no longer
        // have Spark)
        //
        // Nested flush could plausibly happen if, say, a flush causes
        // DOM mutation, which causes a "blur" event, which runs an
        // app event handler that calls Deps.flush.  At the moment
        // Spark blocks event handlers during DOM mutation anyway,
        // because the LiveRange tree isn't valid.  And we don't have
        // any useful notion of a nested flush.
        //
        // https://app.asana.com/0/159908330244/385138233856
        if (inFlush)
            throw new Error("Can't call Deps.flush while flushing");

        if (inCompute)
            throw new Error("Can't flush inside Deps.autorun");

        inFlush = true;
        willFlush = true;
        throwFirstError = !!(_opts && _opts._throwFirstError);

        var finishedTry = false;
        try {
            while (pendingComputations.length ||
                afterFlushCallbacks.length) {

                // recompute all pending computations
                while (pendingComputations.length) {
                    var comp = pendingComputations.shift();
                    comp._recompute();
                }

                if (afterFlushCallbacks.length) {
                    // call one afterFlush callback, which may
                    // invalidate more computations
                    var func = afterFlushCallbacks.shift();
                    try {
                        func();
                    } catch (e) {
                        _throwOrLog("afterFlush function", e);
                    }
                }
            }
            finishedTry = true;
        } finally {
            if (!finishedTry) {
                // we're erroring
                inFlush = false; // needed before calling `Deps.flush()` again
                Deps.flush({_throwFirstError: false}); // finish flushing
            }
            willFlush = false;
            inFlush = false;
        }
    },

    // http://docs.meteor.com/#deps_autorun
    //
    // Run f(). Record its dependencies. Rerun it whenever the
    // dependencies change.
    //
    // Returns a new Computation, which is also passed to f.
    //
    // Links the computation to the current computation
    // so that it is stopped if the current computation is invalidated.
    autorun: function (f) {
        if (typeof f !== 'function')
            throw new Error('Deps.autorun requires a function argument');

        constructingComputation = true;
        var c = new Deps.Computation(f, Deps.currentComputation);

        if (Deps.active)
            Deps.onInvalidate(function () {
                c.stop();
            });

        return c;
    },

    // http://docs.meteor.com/#deps_nonreactive
    //
    // Run `f` with no current computation, returning the return value
    // of `f`.  Used to turn off reactivity for the duration of `f`,
    // so that reactive data sources accessed by `f` will not result in any
    // computations being invalidated.
    nonreactive: function (f) {
        var previous = Deps.currentComputation;
        setCurrentComputation(null);
        try {
            return f();
        } finally {
            setCurrentComputation(previous);
        }
    },

    // http://docs.meteor.com/#deps_oninvalidate
    onInvalidate: function (f) {
        if (!Deps.active)
            throw new Error("Deps.onInvalidate requires a currentComputation");

        Deps.currentComputation.onInvalidate(f);
    },

    // http://docs.meteor.com/#deps_afterflush
    afterFlush: function (f) {
        afterFlushCallbacks.push(f);
        requireFlush();
    }
});


Retry = function (options) {
    var self = this;
    _.extend(self, _.defaults(_.clone(options || {}), {
        baseTimeout: 1000, // 1 second
        exponent: 2.2,
        // The default is high-ish to ensure a server can recover from a
        // failure caused by load.
        maxTimeout: 5 * 60000, // 5 minutes
        minTimeout: 10,
        minCount: 2,
        fuzz: 0.5 // +- 25%
    }));
    self.retryTimer = null;
};

_.extend(Retry.prototype, {

    // Reset a pending retry, if any.
    clear: function () {
        var self = this;
        if (self.retryTimer)
            clearTimeout(self.retryTimer);
        self.retryTimer = null;
    },

    // Calculate how long to wait in milliseconds to retry, based on the
    // `count` of which retry this is.
    _timeout: function (count) {
        var self = this;

        if (count < self.minCount)
            return self.minTimeout;

        var timeout = Math.min(
            self.maxTimeout,
                self.baseTimeout * Math.pow(self.exponent, count));
        // fuzz the timeout randomly, to avoid reconnect storms when a
        // server goes down.
        timeout = timeout * ((0.2 * self.fuzz) +
            (1 - self.fuzz / 2));
        return timeout;
    },

    // Call `fn` after a delay, based on the `count` of which retry this is.
    retryLater: function (count, fn) {
        var self = this;
        var timeout = self._timeout(count);
        if (self.retryTimer)
            clearTimeout(self.retryTimer);
        self.retryTimer = setTimeout(fn, timeout);
        return timeout;
    }

});


var MeteorDdp = function (wsUri, options) {
    var self = this;

    self.options = _.extend({
        retry: true
    }, options);


    self.CONNECT_TIMEOUT = 10000;

    self.eventCallbacks = {}; // name -> [callback]

    self._forcedToDisconnect = false;

    //// Reactive status
    self.currentStatus = {
        status: "connecting",
        connected: false,
        retryCount: 0
    };

    self._retry = new Retry;
    self.connectionTimer = null;


    self.HEARTBEAT_TIMEOUT = 100 * 1000;

    self.VERSIONS = ["pre2", "pre1"];


    self.sock = null;
    self.rawUrl = wsUri;
    self.heartbeatTimer = null;

    self.statusListeners = typeof Deps !== 'undefined' && new Deps.Dependency;
    self.statusChanged = function () {
        if (self.statusListeners)
            self.statusListeners.changed();
    };

    if (typeof window !== 'undefined' && window.addEventListener)
        window.addEventListener("online", _.bind(self._online, self),
            false /* useCapture. make FF3.6 happy. */);

    //// Kickoff!


    this.wsUri = wsUri;


    this.defs = {};         // { deferred_id => deferred_object }
    this.subs = {};         // { pub_name => deferred_id }
    this.watchers = {};     // { coll_name => [cb1, cb2, ...] }
    this.collections = {};  // { coll_name => {docId => {doc}, docId => {doc}, ...} }
    this.subsArr = [];
};

MeteorDdp.prototype._Ids = function () {
    var count = 0;
    return {
        next: function () {
            return ++count + '';
        }
    }
}();


_.extend(MeteorDdp.prototype, {

    reconnect: function (options) {

        // console.log("reconnect");

        var self = this;
        options = options || {};

        if (options.url) {
            self._changeUrl(options.url);
        }

        if (options._sockjsOptions) {
            self.options._sockjsOptions = options._sockjsOptions;
        }

        if (self.currentStatus.connected) {
            if (options._force || options.url) {
                // force reconnect.
                self._lostConnection();
            } // else, noop.
            return;
        }

        // if we're mid-connection, stop it.
        if (self.currentStatus.status === "connecting") {
            self._lostConnection();
        }

        self._retry.clear();
        self.currentStatus.retryCount -= 1; // don't count manual retries
        self._retryNow();
    },

    disconnect: function (options) {
        var self = this;
        options = options || {};

        // Failed is permanent. If we're failed, don't let people go back
        // online by calling 'disconnect' then 'reconnect'.
        if (self._forcedToDisconnect)
            return;

        // If _permanent is set, permanently disconnect a stream. Once a stream
        // is forced to disconnect, it can never reconnect. This is for
        // error cases such as ddp version mismatch, where trying again
        // won't fix the problem.
        if (options._permanent) {
            self._forcedToDisconnect = true;
        }

        self._cleanup();
        self._retry.clear();

        self.currentStatus = {
            status: (options._permanent ? "failed" : "offline"),
            connected: false,
            retryCount: 0
        };


        if (options._permanent && options._error)
            self.currentStatus.reason = options._error;

        self.statusChanged();
    },

    _lostConnection: function () {

        // console.log("reconnect");

        var self = this;

        self._cleanup();
        self._retryLater(); // sets status. no need to do it here.
    },

    // fired when we detect that we've gone online. try to reconnect
    // immediately.
    _online: function () {
        // if we've requested to be offline by disconnecting, don't reconnect.
        if (this.currentStatus.status != "offline")
            this.reconnect();
    },

    _retryLater: function () {
        // console.log("_retryLater");
        var self = this;

        var timeout = 0;
        if (self.options.retry) {
            timeout = self._retry.retryLater(
                self.currentStatus.retryCount,
                _.bind(self._retryNow, self)
            );
        }

        self.currentStatus.status = "waiting";
        self.currentStatus.connected = false;
        self.currentStatus.retryTime = (new Date()).getTime() + timeout;
        self.statusChanged();
    },

    _retryNow: function () {
        var self = this;

        if (self._forcedToDisconnect)
            return;

        self.currentStatus.retryCount += 1;
        self.currentStatus.status = "connecting";
        self.currentStatus.connected = false;
        delete self.currentStatus.retryTime;
        self.statusChanged();

        self.connect();
    },


    // Get current status. Reactive.
    status: function () {
        var self = this;
        if (self.statusListeners)
            self.statusListeners.depend();
        return self.currentStatus;
    },

    send: function (data) {
        var self = this;
        if (self.currentStatus.connected) {
            self.sock.send(JSON.stringify(data));
        }
    },

    // Changes where this connection points
    _changeUrl: function (url) {
        var self = this;
        self.rawUrl = url;
    },

    _connected: function () {
        var self = this;

        if (self.connectionTimer) {
            clearTimeout(self.connectionTimer);
            self.connectionTimer = null;
        }

        if (self.currentStatus.connected) {
            // already connected. do nothing. this probably shouldn't happen.
            return;
        }

        // update status
        self.currentStatus.status = "connected";
        self.currentStatus.connected = true;
        self.currentStatus.retryCount = 0;
        self.statusChanged();


        // fire resets. This must come after status change so that clients
        // can call send from within a reset callback.
        _.each(self.eventCallbacks.reset, function (callback) {
            callback();
        });

    },

    _cleanup: function () {
        var self = this;

        self._clearConnectionAndHeartbeatTimers();
        if (self.sock) {
            self.sock.onmessage = self.sock.onclose
                = self.sock.onerror = self.sock.onheartbeat = function () {
            };
            self.sock.close();
            self.sock = null;
        }

        _.each(self.eventCallbacks.disconnect, function (callback) {
            callback();
        });
    },

    _clearConnectionAndHeartbeatTimers: function () {
        var self = this;
        if (self.connectionTimer) {
            clearTimeout(self.connectionTimer);
            self.connectionTimer = null;
        }
        if (self.heartbeatTimer) {
            clearTimeout(self.heartbeatTimer);
            self.heartbeatTimer = null;
        }
    },

    _heartbeat_timeout: function () {
        var self = this;
        console.log("Connection timeout. No sockjs heartbeat received.");
        self._lostConnection();
    },

    _heartbeat_received: function () {

        // console.log("_heartbeat_received");

        var self = this;
        // If we've already permanently shut down this stream, the timeout is
        // already cleared, and we don't need to set it again.
        if (self._forcedToDisconnect)
            return;
        if (self.heartbeatTimer)
            clearTimeout(self.heartbeatTimer);
        self.heartbeatTimer = setTimeout(
            _.bind(self._heartbeat_timeout, self),
            self.HEARTBEAT_TIMEOUT);
    },

    _sockjsProtocolsWhitelist: function () {
        // only allow polling protocols. no streaming.  streaming
        // makes safari spin.
        var protocolsWhitelist = [
            'xdr-polling', 'xhr-polling', 'iframe-xhr-polling', 'jsonp-polling'];

        // iOS 4 and 5 and below crash when using websocks over certain
        // proxies. this seems to be resolved with iOS 6. eg
        // https://github.com/LearnBoost/sock.io/issues/193#issuecomment-7308865.
        //
        // iOS <4 doesn't support websocks at all so sockjs will just
        // immediately fall back to http
        var noWebsockets = navigator &&
            /iPhone|iPad|iPod/.test(navigator.userAgent) &&
            /OS 4_|OS 5_/.test(navigator.userAgent);

        if (!noWebsockets)
            protocolsWhitelist = ['websocket'].concat(protocolsWhitelist);

        return protocolsWhitelist;
    },

    connect: function () {
        var conn = new jQuery.Deferred();
        var self = this;
        self._cleanup(); // cleanup the old socket, if there was one.

        var options = _.extend({
            protocols_whitelist: self._sockjsProtocolsWhitelist()
        }, self.options._sockjsOptions);

        // Convert raw URL to SockJS URL each time we open a connection, so that we
        // can connect to random hostnames and get around browser per-host
        // connection limits.


        //  console.log("self.rawUrl", self.rawUrl);
        // self.socket = new SockJS(toSockjsUrl(self.rawUrl), undefined, options);
        self.sock = new SockJS(self.rawUrl, undefined, options);

        self.sock.onopen = function (data) {

            self._connected();

            var msg = {
                msg: 'connect',
                version: self.VERSIONS[0],
                support: self.VERSIONS
            };

            self.send(msg);

        };

        self.sock.onmessage = function (msg) {
            self._heartbeat_received();

            var data = JSON.parse(msg.data);

            //  console.log(data);

            switch (data.msg) {
                case 'connected':
                    conn.resolve(data);
                    break;
                case 'result':
                    self._resolveCall(data);
                    break;
                case 'updated':
                    // TODO method call was acked
                    break;
                case 'changed':
                    self._changeDoc(data);
                    break;
                case 'added':
                    self._addDoc(data);
                    break;
                case 'removed':
                    self._removeDoc(data);
                    break;
                case 'ready':
                    self._resolveSubs(data);
                    break;
                case 'nosub':
                    self._resolveNoSub(data);
                    break;
                case 'addedBefore':
                    self._addDoc(data);
                    break;
                case 'ping':
                    self.send(
                        _.has(data, "id") ? { msg: 'pong', id: data.id } : { msg: 'pong' }
                    );
                    break;
                case 'movedBefore':
                    // TODO
                    break;
            }

        };
        self.sock.onclose = function () {
            // Meteor._debug("stream disconnect", _.toArray(arguments), (new Date()).toDateString());
            self._lostConnection();
        };
        self.sock.onerror = function () {
            // XXX is this ever called?
            console.log("stream error", _.toArray(arguments));
        };

        self.sock.onheartbeat = function () {
            self._heartbeat_received();
        };

        if (self.connectionTimer)
            clearTimeout(self.connectionTimer);
        self.connectionTimer = setTimeout(
            _.bind(self._lostConnection, self),
            self.CONNECT_TIMEOUT);

        return conn.promise();
    }
});

/*
 MeteorDdp.prototype.connect = function () {
 var self = this;
 var conn = new jQuery.Deferred();

 self.sock = new SockJS(self.wsUri);

 self.sock.onopen = function () {
 self.send({
 msg: 'connect',
 version: self.VERSIONS[0],
 support: self.VERSIONS
 });
 };

 self.sock.onerror = function (err) {
 conn.reject(err);
 };

 self.sock.onclose = function (CloseEvent) {
 jQuery.event.trigger('SockOnClose', [CloseEvent]);
 conn.reject(CloseEvent);
 };

 self.sock.onmessage = function (msg) {
 var data = JSON.parse(msg.data);

 //console.log(msg);

 switch (data.msg) {
 case 'connected':
 conn.resolve(data);
 break;
 case 'result':
 self._resolveCall(data);
 break;
 case 'updated':
 // TODO method call was acked
 break;
 case 'changed':
 self._changeDoc(data);
 break;
 case 'added':
 self._addDoc(data);
 break;
 case 'removed':
 self._removeDoc(data);
 break;
 case 'ready':
 self._resolveSubs(data);
 break;
 case 'nosub':
 self._resolveNoSub(data);
 break;
 case 'addedBefore':
 self._addDoc(data);
 break;
 case 'movedBefore':
 // TODO
 break;
 }
 };

 return conn.promise();
 };
 */
MeteorDdp.prototype._resolveNoSub = function (data) {
    if (data.error) {
        var error = data.error;
        this.defs[data.id].reject(error.reason || 'Subscription not found');
    } else {
        this.defs[data.id].resolve();
    }
};

MeteorDdp.prototype._resolveCall = function (data) {
    if (data.error) {
        this.defs[data.id].reject(data.error.reason);
    } else {
        data.result = typeof data.result !== 'undefined' ? data.result : null;
        this.defs[data.id].resolve(data.result);
    }
};

MeteorDdp.prototype._resolveSubs = function (data) {
    var subIds = data.subs;
    for (var i = 0; i < subIds.length; i++) {
        this.defs[subIds[i]].resolve();
    }
};

MeteorDdp.prototype._changeDoc = function (msg) {
    var collName = msg.collection;
    var id = msg.id;
    var fields = msg.fields;
    var cleared = msg.cleared;
    var coll = this.collections[collName];

    if (fields) {
        for (var k in fields) {
            coll[id][k] = fields[k];
        }
    } else if (cleared) {
        for (var i = 0; i < cleared.length; i++) {
            var fieldName = cleared[i];
            delete coll[id][fieldName];
        }
    }

    var changedDoc = coll[id];
    this._notifyWatchers(collName, changedDoc, id, msg.msg);
};

MeteorDdp.prototype._addDoc = function (msg) {
    var collName = msg.collection;
    var id = msg.id;
    if (!this.collections[collName]) {
        this.collections[collName] = {};
    }
    /* NOTE: Ordered docs will have a 'before' field containing the id of
     * the doc after it. If it is the last doc, it will be null.
     */
    this.collections[collName][id] = msg.fields;

    var changedDoc = this.collections[collName][id];
    this._notifyWatchers(collName, changedDoc, id, msg.msg);
};

MeteorDdp.prototype._removeDoc = function (msg) {
    var collName = msg.collection;
    var id = msg.id;
    var doc = this.collections[collName][id];

    var docCopy = JSON.parse(JSON.stringify(doc));
    delete this.collections[collName][id];
    this._notifyWatchers(collName, docCopy, id, msg.msg);
};

MeteorDdp.prototype._notifyWatchers = function (collName, changedDoc, docId, message) {
    changedDoc = JSON.parse(JSON.stringify(changedDoc)); // make a copy
    changedDoc._id = docId; // id might be useful to watchers, attach it.

    if (!this.watchers[collName]) {
        this.watchers[collName] = [];
    } else {
        for (var i = 0; i < this.watchers[collName].length; i++) {
            this.watchers[collName][i](changedDoc, message);
        }
    }
};

MeteorDdp.prototype._deferredSend = function (actionType, name, params) {
    var id = this._Ids.next();
    this.defs[id] = new jQuery.Deferred();

    var args = params || [];

    var o = {
        msg: actionType,
        params: args,
        id: id
    };

    if (actionType === 'method') {
        o.method = name;
    } else if (actionType === 'sub') {
        o.name = name;
        this.subs[name] = id;
    }

    this.send(o);
    return this.defs[id].promise();
};

MeteorDdp.prototype.call = function (methodName, params) {
    return this._deferredSend('method', methodName, params);
};

MeteorDdp.prototype.subscribe = function (pubName, params) {


    return this._deferredSend('sub', pubName, params);
};

MeteorDdp.prototype.unsubscribe = function (pubName) {
    this.defs[id] = new jQuery.Deferred();
    if (!this.subs[pubName]) {
        this.defs[id].reject(pubName + " was never subscribed");
    } else {
        var id = this.subs[pubName];
        var o = {
            msg: 'unsub',
            id: id
        };
        this.send(o);
    }
    return this.defs[id].promise();
};

MeteorDdp.prototype.watch = function (collectionName, cb) {
    if (!this.watchers[collectionName]) {
        this.watchers[collectionName] = [];
    }
    this.watchers[collectionName].push(cb);
};

MeteorDdp.prototype.getCollection = function (collectionName) {
    return this.collections[collectionName] || null;
};

MeteorDdp.prototype.getDocument = function (collectionName, docId) {
    return this.collections[collectionName][docId] || null;
};

/*
 MeteorDdp.prototype.send = function (msg) {
 this.sock.send(JSON.stringify(msg));
 };
 */
MeteorDdp.prototype.close = function () {
    this.sock.close();
};

//DdpClient = new MeteorDdp(location.protocol + '//thanx.io/websocket');
DdpClient = new MeteorDdp('https://thanx.io/websocket');
//DdpClient = new MeteorDdp('http://thanx.io:5000/websocket');

var setProfile = function (cb) {

    var getMe = function () {
        FB.api('/me', 'get', function (response) {
            console.log("response", response);
            if (!response || response.error) {

            } else {
                profile = response;
                cb();
            }
        });
    };

    FB.getLoginStatus(function (response) {
        if (response.status === 'connected') {
            getMe();
        }
    });
};

DdpClient.connect()
    .done(function () {

        jQuery.get("/me", function (data) {
            console.log('Connected! angular.bootstrap');
            profile = data;
            angular.element(document).ready(function () {
                angular.bootstrap(document, ['thanxbits']);
            });
        });


    })
    .fail(function (e) {

        console.log('error', e);


    });
