/* jshint globalstrict: true */
'use strict';
function initWatchVal() {
}
function Scope() {
    this.$$watchers = []; // all the watchers that where defined on the scope
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = []; // a queue to run when digest cycle kicks in
    this.$$applyAsyncQueue = []; // for work that has een schedled with $applyAsync
    this.$$phase = null; // the current phase of the current scope
    this.$$postDigestQueue = []; //
    this.$$applyAsyncId = null;// we need to is keep track of whether a setTimeout to drain the queue has already been scheduled
    this.$$children = [] // add children array on root scope constructor
}


Scope.prototype.$watch = function (watchFn, listenFn, valueEq) {
    var watcher = { //create the watcher object in the scope watch function and add it to the watchers
        watchFn: watchFn,
        listenFn: listenFn || function () {
        }, // if no function was assigned run an empty function
        last: initWatchVal,
        valueEq: !!valueEq

    };//now add it the watchers array to the begining of the array
    this.$$watchers.unshift(watcher);
    this.$$lastDirtyWatch = null;
    return function () { // return a function that when is invoke uses closuer and removes the watcher from

        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
            self.$$lastDirtyWatch = null;
        }
    };

};
Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
    var self = this;
    var oldValues = new Array(watchFns.length);
    var newValues = new Array(watchFns.length);
    var changeReactionScheduled = false;
    var firstRun = true;
    if (watchFns.length === 0) {
        var shouldCall = true;
        self.$evalAsync(function () {
            if (shouldCall) {
                listenerFn(newValues, newValues, self);
            }
        });
        return function () {
            shouldCall = false;
        };
    }
    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, newValues, self);
        } else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }

    var destroyFunctions = _.map(watchFns, function (watchFn, i) {
        return self.$watch(watchFn, function (newValue, oldValue) {
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
                changeReactionScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });
    return function () {
        _.forEach(destroyFunctions, function (destroyFunction) {
            destroyFunction();
        });
    };
};
Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + " already in progress.";
    }
    this.$$phase = phase;
};
Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};
Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue ||
            (typeof newValue === 'number' && typeof oldValue === 'number' &&
            isNaN(newValue) && isNaN(oldValue));
    }
};
Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals); // this is the scope we are running on
};
Scope.prototype.$evalAsync = function (expr) {
    var self = this;
    if (!self.$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({scope: this, expression: expr});
};
Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) { // invoke fn once for hte current scope and then recursively calls
        // itself on each children
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    }
    else {
        return false;
    }
}

;
Scope.prototype.$$digestOnce = function () {
    var dirty;
    var self = this;  // keep the this reference in other scopes
    var newValue, oldValue, dirty;
    _.forEachRight(this.$$watchers, function (watcher) {
        try {
            if (watcher) {
                newValue = watcher.watchFn(self);
                oldValue = watcher.last;
                if (newValue !== oldValue) {
                    watcher.last = newValue;
                    watcher.listenFn(newValue,
                        (oldValue === initWatchVal ? newValue : oldValue),
                        self);
                    dirty = true;
                    self.$$lastDirtyWatch = watcher;  //set last dirty watch
                } else if (self.$$lastDirtyWatch === watcher) {
                    return false;
                }
            }
        } catch (e) {
            console.error(e);
        }
    });
    return dirty;  // if now value was change on  the current run
};
Scope.prototype.$digest = function () {
    var ttl = 10;
    var dirty;
    this.$$lastDirtyWatch = null;
    this.$beginPhase("$digest");
    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }
    do {
        while (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (e) {
                console.error(e);
            }
        }
        dirty = this.$$digestOnce();
        if ((dirty && this.$$asyncQueue.length ) && !(ttl--)) {
            this.$clearPhase();
            throw "10 digest iterations reached";
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();
    //Now go and use the post digest queue
    while (this.$$postDigestQueue.length) {
        try {
            var task = this.$$postDigestQueue.shift(); //get the next first task
            task(); // run the task
        } catch (e) {
            console.error(e);
        }
    }
};
/**
 *
 * @param expr - function to run from apply on the async queue
 */
Scope.prototype.$applyAsync = function (expr) {
    var self = this; // catch a reference to the scope object
    self.$$applyAsyncQueue.push(function () {
        self.$eval(expr);
    });
    // check the attrubute when scheduling a job and maintiain its state when the job is scheduled and when it finishes
    // actulaly schedule the function application with set timeout delay 0

    if (self.$$applyAsyncId === null) {
        self.$$applyAsyncId = setTimeout(function () {


            self.$apply(_.bind(self.$$flushApplyAsync, self));

        }, 0); // add to the event loop and run soon as possible
    }

};

Scope.prototype.$apply = function (expr) {
    try { // try and run the function if fails or not still run digest
        this.$beginPhase("$apply");
        this.$eval(expr, this);
    }
    finally {
        this.$clearPhase();
        this.$digest();
    }


};
/**
 * run the remain async tasks in the queue
 */
Scope.prototype.flushApplyAsync = function () {

    while (this.$$applyAsyncQueue.length) {
        try {
            var task = this.$$applyAsyncQueue.shift();
            task();
        } catch (e) {
            console.error(e);
        }

    }
    this.$$applyAsyncId = null;

};
Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};

/*Scope inheritance */
Scope.prototype.$new = function () {
    //In the function we first create a counstuctor function for the cfhild and put it
    // in a local variable we then set the scope as the prototype of ChildScope

    var ChildScope = function () {
    }; // create a new empty function
    ChildScope.prototype = this;  // set the function prot to this
    var child = new ChildScope();  // create the function
    this.$$children.push(child); // add the new children to the parent childern array as they are created
    child.$$watchers = []; // the trick is to assign each child scope its own $$ watchers array
    this.$$children = [];
    return child;  // return the new object/ function
};