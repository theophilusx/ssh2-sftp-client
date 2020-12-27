'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const utils = require('../src/utils');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('formatError tests', function () {
  it('fmtError returns Error object', function () {
    return expect(utils.fmtError('test msg', 'test', 'error code')).to.be.an(
      'error'
    );
  });

  it('fmtError has expected values', function () {
    return expect(
      utils.fmtError('test msg', 'name', 'error code')
    ).to.containSubset({
      message: 'name: test msg',
      code: 'error code'
    });
  });

  it('fmtError has retry count', function () {
    return expect(
      utils.fmtError('test msg', 'name', 'error code', 4)
    ).to.containSubset({
      message: 'name: test msg after 4 attempts',
      code: 'error code'
    });
  });

  it('fmtError has default error code', function () {
    return expect(utils.fmtError('test msg', 'nme').code).to.equal(
      'ERR_GENERIC_CLIENT'
    );
  });

  it('fmtError has default name', function () {
    return expect(utils.fmtError('test msg').message).to.equal(
      'sftp: test msg'
    );
  });
});
