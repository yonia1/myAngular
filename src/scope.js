/* jshint globalstrict: true */
'use strict';
function initWatchVal() { }
function Scope() {
    this.$$watchers = []; // all the watchers that where defined on the scope
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [] ; // a queue to run when digest cycle kicks in
    this.$$applyAsyncQueue = []; // for work that has een schedled with $applyAsync
    this.$$phase = null; // the current phase of the current scope
    this.$$applyAsyncId = null// we need to is keep track of whether a setTimeout to drain the queue has already been scheduled

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
    if(this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }
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
/**
 *
 * @param expr - function to run from apply on the async queue
 */
Scope.prototype.$applyAsync = function(expr){
    var self = this; // catch a reference to the scope object
    self.$$applyAsyncQueue.push(function(){
        self.$eval(expr)
    });
    // check the attrubute when scheduling a job and maintiain its state when the job is scheduled and when it finishes
    // actulaly schedule the function application with set timeout delay 0

    if(self.$$applyAsyncId === null) {
        self.$$applyAsyncId=  setTimeout(function () {


                self.$apply(_.bind(self.$$flushApplyAsync, self));

        }, 0); // add to the event loop and run soon as possible
    }

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
/**
 * run the remain async tasks in the queue
 */
Scope.prototype.flushApplyAsync = function() {

    while(this.$$applyAsyncQueue.length) {
        var task this.$$applyAsyncQueue.shift();
        task();

    }
    this.$$applyAsyncId = null;

};

