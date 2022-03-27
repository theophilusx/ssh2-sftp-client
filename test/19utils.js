'use strict';

const dotenvPath = __dirname + '/../.env';
require('dotenv').config({ path: dotenvPath });

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const utils = require('../src/utils');
const {
  config,
  getConnection,
  closeConnection,
} = require('./hooks/global-hooks');
const fs = require('fs');

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
      code: 'error code',
    });
  });

  it('fmtError has retry count', function () {
    return expect(
      utils.fmtError('test msg', 'name', 'error code', 4)
    ).to.containSubset({
      message: 'name: test msg after 4 attempts',
      code: 'error code',
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
    return expect(utils.fmtError()).to.containSubset({
      message: 'sftp: Undefined error - probably a bug!',
      code: 'ERR_GENERIC_CLIENT',
    });
  });

  it('fmtError handles custom error 1', function () {
    return expect(
      utils.fmtError(utils.fmtError('Original Error', 'someMethod'), 'top')
    ).to.containSubset({
      message: 'top->someMethod: Original Error',
      code: 'ERR_GENERIC_CLIENT',
      custom: true,
    });
  });

  it('fmtError custom errors', function () {
    let e1 = utils.fmtError('Original Error', 'somefunc');
    return expect(utils.fmtError(e1, 'top')).to.containSubset({
      message: 'top->somefunc: Original Error',
      code: 'ERR_GENERIC_CLIENT',
      custom: true,
    });
  });

  it('fmtError error code ENOTFOUND', function () {
    let e = new Error('Not Found');
    e.code = 'ENOTFOUND';
    e.level = 'Client';
    e.hostname = 'bogus.com';
    return expect(utils.fmtError(e, 'func')).to.containSubset({
      message: 'func: Client error. Address lookup failed for host bogus.com',
      code: 'ENOTFOUND',
    });
  });

  it('fmtError error code ECONNREFUSED', function () {
    let e = new Error('Connection refused');
    e.code = 'ECONNREFUSED';
    e.level = 'Server';
    e.address = '1.1.1.1';
    return expect(utils.fmtError(e, 'func')).to.containSubset({
      message: 'func: Server error. Remote host at 1.1.1.1 refused connection',
      code: 'ECONNREFUSED',
    });
  });

  it('fmtError error code ECONNRESET', function () {
    let e = new Error('Connection reset');
    e.code = 'ECONNRESET';
    return expect(utils.fmtError(e, 'func')).to.containSubset({
      message: 'func: Remote host has reset the connection: Connection reset',
      code: 'ECONNRESET',
    });
  });
});

describe('errorListener', function () {
  let client = {
    debugMsg: () => {
      //console.log(msg);
      null;
    },
    errorHandled: false,
    endCalled: false,
    tempListeners: [],
  };

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
    client.temptListeners = [];
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

  it('No error thrown', function () {
    let handler = utils.errorListener(client, 'Test3');
    client.errorHandled = true;
    let e = utils.fmtError('A thrown error');
    e.code = 'GENERIC ERROR';
    let fn = () => {
      handler(e);
    };
    return expect(fn).to.not.throw();
  });

  it('not error throw 2', function () {
    let handler = utils.errorListener(client, 'Test4');
    client.endCalled = true;
    let e = utils.fmtError('A thrown error');
    e.code = 'GENERIC ERROR';
    let fn = () => {
      handler(e);
    };
    return expect(fn).to.not.throw();
  });
});

describe('Test endListener', function () {
  let client = {
    debugMsg: () => {
      //console.log(msg);
      null;
    },
  };

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
    client.tempListeners = [];
  });

  it('endListener throws error', function () {
    let handler = utils.endListener(client, 'Test5');
    let fn = () => {
      handler();
    };
    return expect(fn).to.throw(/Unexpected end event/);
  });

  it('endListener no error 1', function () {
    client.errorHandled = true;
    let handler = utils.endListener(client, 'Test6');
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });

  it('endListener no error 2', function () {
    client.endHandled = true;
    let handler = utils.endListener(client, 'Test7');
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });
});

describe('closeHandler tests', function () {
  let client = {
    debugMsg: () => {
      //console.log(msg);
      null;
    },
  };

  beforeEach(function () {
    client.closeHandled = false;
    client.endCalled = false;
    client.tempListeners = [];
  });

  it('closeHandler throws error', function () {
    let handler = utils.closeListener(client, 'Test8');
    let fn = () => {
      handler();
    };
    return expect(fn).to.throw('Unexpected close event raised');
  });

  it('closeHandler not throw 1', function () {
    let handler = utils.closeListener(client, 'Test9');
    client.closeHandled = true;
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });

  it('closeHandler not throw 2', function () {
    let handler = utils.closeListener(client, 'Test10');
    client.endCalled = true;
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });
});

describe('localExists tests', function () {
  before('setup', function () {
    fs.symlinkSync(
      `${config.localUrl}/test-file1.txt`,
      `${config.localUrl}/test-file1-link.txt`
    );
  });

  after('cleanup', function () {
    fs.unlinkSync(`${config.localUrl}/test-file1-link.txt`);
  });

  it('file exists', function () {
    let path = `${config.localUrl}/test-file1.txt`;
    return expect(utils.localExists(path)).to.equal('-');
  });

  it('directory exists', function () {
    return expect(utils.localExists(config.localUrl)).to.equal('d');
  });

  it('thow error for bad target', function () {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    let fn = () => {
      utils.localExists('/dev/tty');
    };
    return expect(fn).to.throw(/Bad path/);
  });
});

describe('haveLocalAccess tests', function () {
  it('have local read access', function () {
    return expect(
      utils.haveLocalAccess(`${config.localUrl}/test-file1.txt`).status
    ).to.equal(true);
  });

  it('have local writ4e access', function () {
    return expect(
      utils.haveLocalAccess(`${config.localUrl}/test-file1.txt`, 'w').status
    ).to.equal(true);
  });

  it('not have local read access', function () {
    return expect(
      utils.haveLocalAccess(`${config.localUrl}/no-access.txt`).status
    ).to.equal(false);
  });

  it('not have local write access', function () {
    return expect(
      utils.haveLocalAccess(`${config.localUrl}/no-access.txt`, 'w').status
    ).to.equal(false);
  });

  it('not exist local access', function () {
    return expect(
      utils.haveLocalAccess(`${config.localUrl}/not-exist.txt`).status
    ).to.equal(false);
  });
});

describe('haveLocalCreate tests', function () {
  it('local create with file', function () {
    return expect(
      utils.haveLocalCreate(`${config.localUrl}/test-file1.txt`).status
    ).to.equal(true);
  });

  it('local create with directory', function () {
    return expect(utils.haveLocalCreate(config.localUrl).status).to.equal(true);
  });

  it('local create with non-existing file', function () {
    return expect(
      utils.haveLocalCreate(`${config.localUrl}/no-exist.txt`).status
    ).to.equal(true);
  });

  it('local create with no permission', function () {
    return expect(
      utils.haveLocalCreate(`${config.localUrl}/no-access.txt`).details
    ).to.equal('permission denied');
  });

  it('local create bad dir 1', function () {
    return expect(
      utils.haveLocalCreate(`${config.localUrl}/bar/foo.txt`).status
    ).to.equal(false);
  });

  it('local create bad dir 2', function () {
    return expect(
      utils.haveLocalCreate(`${config.localUrl}/no-access.txt/foo.txt`).status
    ).to.equal(false);
  });

  it('local create bad dir 3', function () {
    return expect(
      utils.haveLocalCreate(`${config.localUrl}/test-file1.txt/foo.txt`).status
    ).to.equal(false);
  });
});

describe('hasConnection tests', function () {
  let client;

  before('setup', async function () {
    client = await getConnection();
  });

  after('cleanup', async function () {
    if (client.sftp) {
      await closeConnection(client);
    }
  });

  it('has a connection', function () {
    return expect(utils.haveConnection(client, 'Test1')).to.equal(true);
  });

  it('no connection throws error', async function () {
    await client.end();
    let fn = () => {
      expect(utils.haveConnection(client, 'Test2'));
    };
    return expect(fn).to.throw(/No SFTP connection/);
  });

  it('Promise rejected', function () {
    let p = new Promise((resolve, reject) => {
      utils.haveConnection(client, 'Test3', reject);
    });
    return expect(p).to.be.rejectedWith(/No SFTP connection/);
  });
});
