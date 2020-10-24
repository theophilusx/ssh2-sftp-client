'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const utils = require('../src/utils');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('formatError tests', function () {
  it('formatError returns Error object', function () {
    return expect(utils.formatError('test msg', 'test', 'error code')).to.be.an(
      'error'
    );
  });

  it('formatError has expected values', function () {
    return expect(
      utils.formatError('test msg', 'name', 'error code')
    ).to.containSubset({
      message: 'name: test msg',
      code: 'error code'
    });
  });

  it('formatError has retry count', function () {
    return expect(
      utils.formatError('test msg', 'name', 'error code', 4)
    ).to.containSubset({
      message: 'name: test msg after 4 attempts',
      code: 'error code'
    });
  });

  it('formatError has default error code', function () {
    return expect(utils.formatError('test msg', 'nme').code).to.equal(
      'ERR_GENERIC_CLIENT'
    );
  });

  it('formatError has default name', function () {
    return expect(utils.formatError('test msg').message).to.equal(
      'sftp: test msg'
    );
  });
});
