'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const utils = require('../src/utils');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('fmtError() tests', function () {
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

  it('fmtError handles null error', function () {
    return expect(utils.fmtError(undefined)).to.containSubset({
      message: 'sftp: Undefined error - probably a bug!',
      code: 'ERR_GENERIC_CLIENT'
    });
  });

  it('fmtError handles custom error 1', function () {
    return expect(
      utils.fmtError(utils.fmtError('Original Error', 'someMethod'), 'top')
    ).to.containSubset({
      message: 'top->someMethod: Original Error',
      code: 'ERR_GENERIC_CLIENT',
      custom: true
    });
  });

  it('fmtError custom errors', function () {
    let e1 = utils.fmtError('Original Error', 'somefunc');
    return expect(utils.fmtError(e1, 'top')).to.containSubset({
      message: 'top->somefunc: Original Error',
      code: 'ERR_GENERIC_CLIENT',
      custom: true
    });
  });

  it('fmtError error code ENOTFOUND', function () {
    let e = new Error('Not Found');
    e.code = 'ENOTFOUND';
    e.level = 'Client';
    e.hostname = 'bogus.com';
    return expect(utils.fmtError(e, 'func')).to.containSubset({
      message: 'func: Client error. Address lookup failed for host bogus.com',
      code: 'ENOTFOUND'
    });
  });

  it('fmtError error code ECONNREFUSED', function () {
    let e = new Error('Connection refused');
    e.code = 'ECONNREFUSED';
    e.level = 'Server';
    e.address = '1.1.1.1';
    return expect(utils.fmtError(e, 'func')).to.containSubset({
      message: 'func: Server error. Remote host at 1.1.1.1 refused connection',
      code: 'ECONNREFUSED'
    });
  });

  it('fmtError error code ECONNRESET', function () {
    let e = new Error('Connection reset');
    e.code = 'ECONNRESET';
    return expect(utils.fmtError(e, 'func')).to.containSubset({
      message: 'func: Remote host has reset the connection: Connection reset',
      code: 'ECONNRESET'
    });
  });
});

describe('errorListener', function () {
  let client = {
    debugMsg: (msg) => {
      //console.log(msg);
      null;
    },
    errorHandled: false,
    endCalled: false
  };

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
  });

  it('error is rejected', function () {
    let p = new Promise((resolve, reject) => {
      let handler = utils.errorListener(client, 'Test1', reject);
      let e = new Error('A plain error');
      e.code = 'GENERIC ERROR';
      handler(e);
    });
    return expect(p).to.be.rejectedWith(/Test1: A plain error/);
  });

  it('error is thrown', function () {
    let handler = utils.errorListener(client, 'Test2');
    let e = utils.fmtError('A thrown error');
    e.code = 'GENERIC ERROR';
    let fn = () => {
      handler(e);
    };
    return expect(fn).to.throw(/Test2->sftp: A thrown error/);
  });
});

describe('endListener', function () {
  let client = {
    debugMsg: (msg) => {
      //console.log(msg);
      null;
    },
    errorHandled: false,
    endCalled: false
  };

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
  });

  it('end rejected', function () {
    let p = new Promise((resolve, reject) => {
      let handler = utils.endListener(client, 'Test3', reject);
      handler();
    });
    return expect(p).to.be.rejectedWith(/Test3: Unexpected end event raised/);
  });

  it('end raises error', function () {
    let handler = utils.endListener(client, 'Test4');
    return expect(handler).to.throw(/Test4: Unexpected end event raised/);
  });
});

describe('closeListener', function () {
  let client = {
    debugMsg: (msg) => {
      //console.log(msg);
      null;
    },
    errorHandled: false,
    endCalled: false
  };

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
  });

  it('close rejected', function () {
    let p = new Promise((resolve, reject) => {
      let handler = utils.closeListener(client, 'Test5', reject);
      handler();
    });
    return expect(p).to.be.rejectedWith(/Test5: Unexpected close event raised/);
  });

  it('close throws error', function () {
    let handler = utils.closeListener(client, 'Test6');
    return expect(handler).to.throw(/Test6: Unexpected close event raised/);
  });
});
