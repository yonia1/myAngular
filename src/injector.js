/**
 * Created by yamishav on 16/03/2016.
 */
'use strict'


function createInjector(modulesToLoad) {

    var $provide = {
        constant: function (key, value) {
            key, value
        }
    };
    _.forEach(modulesToLoad, function (moduleName) {
        var module = angular.module(moduleName);
        _.forEach(nodule._invokeQueue, function (invokeArgs) {
            var method = invokeArgs[0];
            var args = invokeArgs[1];
            $provide[method].apply($provide, args);
        });
    });
    return {};
}