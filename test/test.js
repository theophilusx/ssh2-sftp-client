'use strict';

let expect = require('chai').expect;

describe('list', function() {
    it('should return the list name of each', function() {
        expect([{type: '-', name: 'aaa'}, {type: 'd', name: 'bbb'}]).to.include.values('aaa');
    });
});
