/**
 * Created by yamishav on 14/02/2016.
 */
'use strict'

describe('parse', function () {
    it('can parse an integer', function () {
        var fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    })
})