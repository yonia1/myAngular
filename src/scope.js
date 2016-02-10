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
    this.$root = this; // this is the root scope so every child will inhert this property
    // that is set only once , thanks to the protoypal inheritance chain
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
    this.$root.$$lastDirtyWatch = null;
    return function () { // return a function that when is invoke uses closuer and removes the watcher from

        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
            self.$$lastDirtyWatch = null;
            self.$root.$$lastDirtyWatch = null;
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
    var self = this; // will happen in the next tic  of the event loop
    if (!self.$phase && !self.$$asyncQueue.length) {
        setTimeout(function () { // the timeout is for the event  loop
            if (self.$$asyncQueue.length) {
                self.$root.$digest(); // once the event loops fires digest from the root
            }
        }, 0);
    }
    this.$$asyncQueue.push({scope: this, expression: expr});
};
Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};
Scope.prototype.$$digestOnce = function () {
    var dirty;
    var continueLoop = true;
    var self = this;
    this.$$everyScope(function (scope) {
        var newValue, oldValue
        _.forEachRight(scope.$$watchers, function (watcher) {
            try {
                if (watcher) {
                    newValue = watcher.watchFn(scope);
                    oldValue = watcher.last;
                    if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                        self.$$root.$$lastDirtyWatch = watcher;
                        watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                        watcher.listenerFn(newValue,
                            (oldValue === initWatchVal ? newValue : oldValue),
                            scope);
                        dirty = true;
                    } else if (self.$root.$$lastDirtyWatch === watcher) {
                        continueLoop = false;
                        return false;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        });
        return dirty !== false;
    });
    return dirty;
};


Scope.prototype.$digest = function () {
    var ttl = 10;
    var dirty;
    this.$root.$$lastDirtyWatch = null;
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
        this.$root.$digest(); // fetch the root scope element and start the digest cycle form there
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
Scope.prototype.$new = function (isolated, parent) {
    var child; // the child object
    parent = parent || this; //parent is optional so if non is given he the invoker is the parent scope
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function () {
        };
        ChildScope.prototype = this;
        child = new ChildScope();
    }
    parent.$$children.push(child);
    child.$$watchers = [];
    child.$$children = [];
    child.$parent = parent;
    return child;
};
Scope.prototype.$destroy = function () {
    if (this.$parent) {
        var siblings = this.$parent.$$children;
        var indexOfThis = siblings.indexOf(this);
        if (indexOfThis > 0) {
            siblings.splice(indexOfThis, 1);

        }
    }
    this.$$watchers = null;
};
Scope.prototype.$watchCollection = function (watchFn /*what are we looking at*/, listenerFn /*what do we do when change*/) {
    var self = this;
    var newValue;
    var oldValue;
    var changeCount = 0;  // use clouser to keep count

    var internalWatchFn = function (scope) {
        newValue = watchFn(scope);  // run the watch function - what to do when value changes
        if (_.isObject(newValue)) {
            if (_.isArray(newValue)) {
                if(_.isArray(oldValue)){
                    changeCount++;
                    oldValue = [];
                }
                if(newValue.length !== oldValue.length) {  // notice that the length of the array has changed
                    changeCount++;
                    oldValue.length = newValue.length;
                }
                _.forEach(newValue , function (newItem ,i) { // iterate over the array and see if there is any changes in any items
                    var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);  //  check if the value was and now also a NAN
                    if (!bothNaN && newItem !== oldValue[i]) {
                        changeCount++;
                        oldValue[i] = newItem;
                    }

                });
            } else {
            }
        } else {
            if (!self.$$areEqual(newValue, oldValue, false)) {
                changeCount++;
            }
            oldValue = newValue;
        }
        return changeCount;
    };


    var internalListenerFn = function () {
        listenerFn(newValue, oldValue, self); // run what happens when value change
    };

    return this.$watch(internalWatchFn, internalListenerFn);

};
