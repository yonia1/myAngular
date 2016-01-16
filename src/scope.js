/* jshint globalstrict: true */
'use strict';
function initWatchVal() { }
function Scope() {
    this.$$watchers = []; // all the watchers that where defined on the scope
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [] ; // a queue to run when digest cycle kicks in
    this.$$phase = null; // the current phase of the current scope

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
Scope.prototype.$beginPhase = function (phase) {
  if (this.$$phase){
      throw this.$$phase +" already in progress.";
  }
    this.$$phase = phase;
};
Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
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
Scope.prototype.$evalAsync= function (expr ){
    var self = this;
    if(!self.$phase && !self.$$asyncQueue.length){
        setTimeout(function() {
            if(self.$$asyncQueue.length){
                self.$digest();
            }
        },0);
    }
    this.$$asyncQueue.push({scope: this ,expression : expr});
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
    var ttl = 10;
    var dirty;
    this.$$lastDirtyWatch = null;
    this.$beginPhase("$digest");
    do {
        while (this.$$asyncQueue.length) {
            var asyncTask = this.$$asyncQueue.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }
        dirty = this.$$digestOnce();
        if ((dirty && this.$$asyncQueue.length ) && !(ttl--)) {
            this.$clearPhase();
            throw "10 digest iterations reached";
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();
};
Scope.prototype.$applyAsync = function(){
    var self = this;

};

Scope.prototype.$apply = function ( expr ){
    try
    { // try and run the function if fails or not still run digest
        this.$beginPhase("$apply");
        this.$eval(expr,this);
    }
    finally {
        this.$clearPhase();
        this.$digest();
    }


};

