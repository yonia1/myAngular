/**
 * Created by yamishav on 16/03/2016.
 */
'use strict';
var getModule = function (name, modules) {
    if (modules.hasOwnProperty(name)) {
        return modules[name];
    }
    else
        throw  'Module ' + name + " is not available!";
};
function setupModuleLoader(window) {
    // check for an existing window.angular

    var ensure = function (obj, name, factory) {
        return obj[name] || (obj[name] = factory());
    }

    // use the ensur once place it on window and create the angular module first
    // as an object
    var angular = ensure(window, 'angular', Object);


    var createModule = function (name, requires, modules) {
        if (name === 'hasOwnProperty') {
            throw  'hasOwnProperty is not a valid module name';
        }
        var invokeQueue = [];
        // returns a function that has been preconfigured
        // for tyoe if application compnent
        // the function pushes to the invoke queue an array
        // with that method name and any arg given
        var invokeLater = function(method) {
            return function () {
                invokeQueue.push([method , arguments]);
                return moduleInstance;
            }
        };
        var moduleInstance = {
            name: name,
            requires: requires,
            constant : invokeLater('constant'),


            provider : invokeLater('provider'),
            _invokeQueue: invokeQueue
        }
        modules[name] = moduleInstance;
        return moduleInstance;
    }


    // create on angular object a module that returns a fuction
    ensure(angular, 'module', function () {
        var modules = {};
        return function (name, requires) {
            if (requires) { // if we have a requires field - this is a creation of a module
                return createModule(name, requires); // returns a module Instance
            }
            else {
                return getModle(name, modules);
            }

        }
    });
}
