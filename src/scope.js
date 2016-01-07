/* jshint globalstrict: true */
'use strict';
function initWatchVal() { }
function Scope() {
    this.$$watchers = []; // all the watchers that where defined on the scope
}
Scope.prototype.$watch =function(watchFn, listenFn ) {
    var watcher = { //create the watcher object in the scope watch function and add it to the watchers
        watchFn : watchFn,
        listenFn :listenFn
    } // now add it the watchers array
    this.$$watchers.push(watcher);
    //test
}
Scope.prototype.$digest = function () {
    var self = this;
    var newValue, oldValue;

    _.forEach(this.$$watchers, function(watcher) {

        newValue = watcher.watchFn(self);  // give the watch function it context
        watcher.listenerFn(newValue, oldValue, self);
        // evaluate the watch function and see what changes


    })
}
