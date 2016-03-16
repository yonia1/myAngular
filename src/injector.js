/**
 * Created by yamishav on 16/03/2016.
 */
'use strict'


function createInjector(modulesToLoad) {
    var cache = {};
    var $provide = {
        constant: function (key, value) {
            if (key === hasOwnProperty) {
                throw  'hasOwnProperty is not a valid constant name!';
            }
            cache[key] = value;
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
    return {
        has: function (key) {
            return cache.hasOwnProperty(key);
        },
        get: function (key) {
            return cache[key];
        }
    };
}