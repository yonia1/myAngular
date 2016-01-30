'use strict';
describe("Scope", function () {
    it("can be constructed and used as an object", function () {
        var scope = new Scope();
        scope.aProperty = 1;
        expect(scope.aProperty).toBe(1);
    });
    describe("digest", function () {
        var scope;
        beforeEach(function () {
            scope = new Scope();
        });
        it("ends the digest when the last watch is clean", function () {
            scope.array = _.range(100);
            var watchExecutions = 0;
            _.times(100, function (i) {
                scope.$watch(
                    function (scope) {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    function (newValue, oldValue, scope) {
                    }
                );
            });
            scope.$digest();
            expect(watchExecutions).toBe(200);
            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });
        it("calls the listener function of a watch on first $digest", function () {
            var watchFn = function () {
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(listenerFn).toHaveBeenCalled();
        });
        it("has a $$phase field whose value is the current digest phase", function () {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;
            scope.$watch(
                function (scope) {
                    scope.phaseInWatchFunction = scope.$$phsae; // get the phase

                },
                function (newValue, oldValue, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );
            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });
        it("schedules a digest in $evalAsync", function (done) {
            scope.aValue = "abc";
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValuem, oldValue, scope) {
                scope.counter++;
            });
            scope.$evalAsync(function (scope) {
            });

            expect(scope.counter).toBe(0);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);

        });
        it('allows async $apply with $applyAsunc', function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                don();
            }, 50);

        });
        it("exrcuters $evalAsync'ed functions added by watch functions", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.$watch(
                function (scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                }
            );
            scope.$digest();
            expect(scope.asyncEvaluated.toBe(true));
        });
        it("calls listener when watch value is first undefined", function () {
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("may have watchers that omit the listener function", function () {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it("gives up on the watches after 10 iterations", function () {
            scope.counterA = 0;
            scope.counterB = 0;
            scope.$watch(
                function (scope) {
                    return scope.counterA;
                },
                function (newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.counterB;
                },
                function (newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );
            expect((function () {
                scope.$digest();
            })).toThrow();
        });
        it("correctly handles NaNs", function () {
            scope.number = 0 / 0; // NaN
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.number;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("executes $applyed function and starts the digest", function () {
            scope.aValue = 'soneValue';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$apply(function (scope) {
                scope.aValue = 'someOtherValue';

            });
            expect(scope.counter).toBe(2);
        });
        it("executes $evalAsync'ed function later in the same cycle", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
            );
            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });
        it("executes $eval'ed function and returns result", function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope) {
                return scope.aValue;
            });
            expect(result).toBe(42);
        });
        it("passes the second $eval argument straight through", function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope, arg) {
                return scope.aValue + arg;
            }, 2);
            expect(result).toBe(44);
        });
        it("calls the listner function when the watch value changes", function () {
            scope.someValue = 'a';
            scope.count = 0;
            scope.$watch(
                function (scope) {

                    return scope.someValue;
                },//the value to watch over
                function (newValue, oldValue, scope) {

                    scope.counter++;
                }  // each time add to the counter
            );
            //digest and expect the counter to change
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.someValue = 'b';
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(2);


        });
        it("coalesces many calls to $applyAsync ", function (done) {
            scope.counter = 0;
            scope.$watch(// set up the watch for scope counter
                function (scope) {
                    return scope.counter;
                },
                function (newValue, oldValue, scope) {
                }
            );

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);

        });
        it("cancels and flushes $applyAsync if digest first", function (done) {
            scope.count = 0;
            scope.$watch(function (scope) {
                scope.counter++;
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });
            scope.$digest(); // trigger a digest cycle
            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual(def);
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });
        it('runs a $$postDigest function after each digest',function() {
            scope.counter =0;
            scope.$$postDigest(function() {
                scope.counter++;
            });
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it('it runs $$postDigest after each digest',function() {
            scope.counter = 0;
            scope.$$postDigest(function() {
                scope.counter++;
            });
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1)
        });
        it('catches exceptions in watch functions and continues', function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.watch(function(scope){
                throw 'error';
            },function(newValue, oldValue, scope){
                scope.counter++;
            });
            scope.$digest();
            expext(scope.counter).toBe(1);
        });
        it('catches exceptions in listener functions and continues',function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.watch(function(scope){
                throw 'error';
            },function(newValue, oldValue, scope){
                scope.counter++;
            });
            scope.watch(function(scope){
               return scope.aValue;
            },function(newValue, oldValue, scope){
                scope.counter++;
            });
            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it('it catches exceptions in $evalAsync',function(done){
            scope.aValue = 'abc;' ;
            scope.counter =0;
            scope.$watch(function(scope){
                return scope.aValue;
            }, function(newValue, oldValue, scope){
                scope.counter++;
            });
            scope.$evalAsync(function(){
                throw 'error';
            });
            setTimeout(function(){
                expect(scope.counter).toBe(1);
                done();
            } ,50);
        });
        it("catches exceptions in $applyAsync", function(done) {
            scope.$applyAsync(function(scope) {
                throw "Error";
            });
            scope.$applyAsync(function(scope) {
                throw "Error";
            });
            scope.$applyAsync(function(scope) {
                scope.applied = true;
            });
            setTimeout(function() {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });
        it('allows destroying a $watch with a removal function', function(){
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch = scope.$watch(
                function(scope){
                    return scope.aValue;
                },
                function(newValue, oldValue , scope){
                    scope.counter++;
                }

            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.aValue = 'ghi';

            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

    });
});

