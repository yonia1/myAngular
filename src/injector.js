/**
 * Created by yamishav on 16/03/2016.
 */
'use strict'


function createInjector(modulesToLoad) {
    var cache = {};  // save the modules
    // we need to deal with circular dependencies to make sure each module is loaded once
    //
    var loadedModules = {};

    var $provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw  'hasOwnProperty is not a valid constant name!';
            }
            cache[key] = value;
        }
    };
    function  anotate(fn) {
        if(_.isArray(fn)) { // if fn is an array annotate should retunr an array of all but the
            //last item of it
            return fn.slice(0,fn.length-1);
        } else if(fn.$inject) {
            return fn.$inject;
        }
        else
            return [];

    }
    function invoke(fn, self,locals) {
        //For each argument replace it with the cache object
        var args = _.map(fn.$inject, function (token) {
            if (_.isString(token))
            // if the locals can replace the token replace it with the requested value
                return locals && locals.hasOwnProperty(token) ?
                    locals[token] :
                    cache[token];
            else
                throw    'Incorrect injection token! Expected a string, got' + token;
        });
        //after replace run
        return fn.apply(self, args);
    }


    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if (!loadedModules.hasOwnProperty(moduleName)) {
            loadedModules[moduleName] = true;
            var module = angular.module(moduleName); // ask for the module
            _.forEach(module.requires, loadModule);

            forEach(nodule._invokeQueue, function (invokeArgs) {
                var method = invokeArgs[0];
                var args = invokeArgs[1];
                $provide[method].apply($provide, args);
            });
        }


    });
    return {
        has: function (key) {
            return cache.hasOwnProperty(key);
        },
        get: function (key) { // using clouser
            return cache[key];
        },
        annotate: anotate,
        invoke: invoke
    };
}