/* jshint globalstrict: true */
'use strict';
function initWatchVal() { }
function Scope() {
    this.$$watchers = []; // all the watchers that where defined on the scope
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [] ; // a queue to run when digest cycle kicks in

}
Scope.prototype.$watch =function(watchFn, listenFn ,valueEq ) {
    var watcher = { //create the watcher object in the scope watch function and add it to the watchers
        watchFn : watchFn,
        listenFn :listenFn || function() { }, // if no function was assigned run an empty function
        last: initWatchVal ,
        valueEq: !!valueEq

    };//now add it the watchers array
    this.$$watchers.push(watcher);
    this.$$lastDirtyWatch = null;

};
Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue ||
            (typeof newValue === 'number' && typeof oldValue === 'number' &&
            isNaN(newValue) && isNaN(oldValue));
    }
};
Scope.prototype.$eval=function(expr ,locals){
    return expr(this,locals); // this is the scope we are running on
};
Scope.prot.$evalAsync= function (expr ){
    this.$$asyncQueue.push({scope: this ,expression : expr})
};
Scope.prototype.$$digestOnce = function() {
    var self =this ;  // keep the this reference in other scopes
    var newValue, oldValue, dirty ;
    _.forEach(this.$$watchers ,function (watcher) {
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;
        if (newValue !== oldValue) {
            watcher.last = newValue;
            watcher.listenFn(newValue,
                (oldValue === initWatchVal ? newValue : oldValue),
                self);
            dirty = true;
            self.$$lastDirtyWatch = watcher;  //set last dirty watch
        }else if (self.$$lastDirtyWatch === watcher) {
            return false;
        }
    });
    return dirty;  // if now value was change on  the current run
};

Scope.prototype.$digest = function() {
    var dirty;
    var ttl = 10;
    this.$$lastDirtyWatch = null;  /// firsr run set null , if there is a full run that returns to the same watcher the init the cycle then stop
    do { // keep the digest running as long as values are dirty
        dirty = this.$$digestOnce();
        if (dirty && ! ( ttl-- ))
            throw  ("10 digest iterations reached");

    } while (dirty);
};
Scope.prototype.$apply = function ( expr ){
    try
    { // try and run the function if fails or not still run digest
        this.$eval(expr,this);
    }
    finally {

        this.$digest();
    }


}
