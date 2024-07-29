const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  errorListener,
  endListener,
  closeListener,
  removeTempListeners,
  addTempListeners,
  localExists,
  haveLocalAccess,
  haveLocalCreate,
  haveConnection,
  normalizeRemotePath,
  sleep,
  partition,
} = require('../src/utils.js');
const { config, getConnection, closeConnection } = require('./hooks/global-hooks.js');
const { symlinkSync, unlinkSync } = require('node:fs');
const SftpClient = require('../src/index.js');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('20utils: fmtError() tests', function () {
  let client = new SftpClient('19utils');

  it('fmtError returns Error object', function () {
    return expect(client.fmtError('test msg', 'test', 'error code')).to.be.an('error');
  });

  it('fmtError has expected values', function () {
    const err = client.fmtError('test msg', 'name', 'error code');
    expect(err.message).to.equal('name: test msg');
    return expect(err.code).to.equal('error code');
  });

  it('fmtError has retry count', function () {
    return expect(client.fmtError('test msg', 'name', 'error code', 4)).to.containSubset({
      message: 'name: test msg after 4 attempts',
      code: 'error code',
    });
  });

  it('fmtError has default error code', function () {
    return expect(client.fmtError('test msg', 'nme').code).to.equal('ERR_GENERIC_CLIENT');
  });

  it('fmtError has default name', function () {
    return expect(client.fmtError('test msg').message).to.equal('sftp: test msg');
  });

  it('fmtError handles null error', function () {
    return expect(client.fmtError()).to.containSubset({
      message: 'sftp: Undefined error - probably a bug!',
      code: 'ERR_GENERIC_CLIENT',
    });
  });

  it('fmtError handles custom error 1', function () {
    return expect(
      client.fmtError(client.fmtError('Original Error', 'someMethod'), 'top'),
    ).to.containSubset({
      message: 'top->someMethod: Original Error',
      code: 'ERR_GENERIC_CLIENT',
      custom: true,
    });
  });

  it('fmtError custom errors', function () {
    let e1 = client.fmtError('Original Error', 'somefunc');
    return expect(client.fmtError(e1, 'top')).to.containSubset({
      message: 'top->somefunc: Original Error',
      code: 'ERR_GENERIC_CLIENT',
      custom: true,
    });
  });

  it('fmtError error code ENOTFOUND', function () {
    let e = new Error('Not Found');
    e.code = 'ENOTFOUND';
    return expect(client.fmtError(e, 'func')).to.containSubset({
      message: 'func: Address lookup failed for host',
      code: 'ENOTFOUND',
    });
  });

  it('fmtError error code ECONNREFUSED', function () {
    let e = new Error('Connection refused');
    e.code = 'ECONNREFUSED';
    e.level = 'Server';
    e.address = '1.1.1.1';
    return expect(client.fmtError(e, 'func')).to.containSubset({
      message: 'func: Remote host refused connection',
      code: 'ECONNREFUSED',
    });
  });

  it('fmtError error code ECONNRESET', function () {
    let e = new Error('Connection reset');
    e.code = 'ECONNRESET';
    return expect(client.fmtError(e, 'func')).to.containSubset({
      message: 'func: Remote host has reset the connection: Connection reset',
      code: 'ECONNRESET',
    });
  });
});

describe('20utils B: errorListener', function () {
  // let client = {
  //   debugMsg: () => {
  //     //console.log(msg);
  //     null;
  //   },
  //   errorHandled: false,
  //   endCalled: false,
  //   tempListeners: [],
  // };
  const client = new SftpClient('handler-tests');

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
    client.temptListeners = [];
  });

  it('error is rejected', function () {
    let p = new Promise((_, reject) => {
      let handler = errorListener(client, 'Test1', reject);
      let e = new Error('A plain error');
      e.code = 'GENERIC ERROR';
      handler(e);
    });
    return expect(p).to.be.rejectedWith(/Test1: A plain error/);
  });

  it('error is thrown', function () {
    let handler = errorListener(client, 'Test2');
    let e = client.fmtError('A thrown error');
    e.code = 'GENERIC ERROR';
    let fn = () => {
      handler(e);
    };
    return expect(fn).to.throw(/A thrown error/);
  });

  it('No error thrown', function () {
    let handler = errorListener(client, 'Test3');
    client.errorHandled = true;
    let e = client.fmtError('A thrown error');
    e.code = 'GENERIC ERROR';
    let fn = () => {
      handler(e);
    };
    return expect(fn).to.not.throw();
  });

  it('not error throw 2', function () {
    let handler = errorListener(client, 'Test4');
    client.endCalled = true;
    let e = client.fmtError('A thrown error');
    e.code = 'GENERIC ERROR';
    let fn = () => {
      handler(e);
    };
    return expect(fn).to.throw();
  });
});

describe('20utils C: Test endListener', function () {
  // let client = {
  //   debugMsg: () => {
  //     //console.log(msg);
  //     null;
  //   },
  // };

  const client = new SftpClient('end listener tests');

  beforeEach(function () {
    client.errorHandled = false;
    client.endCalled = false;
    client.endHandled = false;
    client.tempListeners = [];
  });

  // it('endListener throws error', function () {
  //   let handler = utils.endListener(client, 'Test5');
  //   let fn = () => {
  //     handler();
  //   };
  //   return expect(fn).to.throw(/Unexpected end event/);
  // });

  it('endListener error', function () {
    let handler = endListener(client, 'TestA');
    let fn = () => {
      handler();
    };
    return expect(fn).to.throw();
  });

  it('endListener error 1', function () {
    client.errorHandled = true;
    let handler = endListener(client, 'Test6');
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });

  it('endListener no error 2', function () {
    client.endHandled = true;
    let handler = endListener(client, 'Test7');
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });

  it('endListener no error 3', function () {
    client.endCalled = true;
    let handler = endListener(client, 'Test8');
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });
});

describe('20utils D: closeHandler tests', function () {
  // let client = {
  //   debugMsg: () => {
  //     //console.log(msg);
  //     null;
  //   },
  // };
  const client = new SftpClient('close-listener-tests');

  beforeEach(function () {
    client.closeHandled = false;
    client.endCalled = false;
    client.endHandled = false;
    client.errorHandled = false;
    client.tempListeners = [];
  });

  // it('closeHandler throws error', function () {
  //   let handler = utils.closeListener(client, 'Test8');
  //   let fn = () => {
  //     handler();
  //   };
  //   return expect(fn).to.throw('Unexpected close event raised');
  // });

  it('closeHandler unhandled', function () {
    let handler = closeListener(client, 'TestB');
    let fn = () => {
      handler();
    };
    return expect(fn).to.throw();
  });

  it('closeHandler not throw 1', function () {
    let handler = closeListener(client, 'Test9');
    client.closeHandled = true;
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });

  it('closeHandler not throw 2', function () {
    let handler = closeListener(client, 'Test10');
    client.endCalled = true;
    let fn = () => {
      handler();
    };
    return expect(fn).to.not.throw();
  });
});

describe('20utils E: Add/Remove temp listeners', function () {
  const client = new SftpClient('add-remove-listener-test');
  let listeners = null;

  beforeEach(function () {
    if (listeners) {
      removeTempListeners(client, listeners, 'tl-test');
      listeners = null;
    }
  });

  it('add temp listeners', function () {
    listeners = addTempListeners(client, 'tl-test');
    expect(listeners).to.be.an('object');
    return expect(listeners).to.have.all.keys('end', 'close', 'error');
  });

  it('remove temp listeners', function () {
    listeners = addTempListeners(client, 'tl-test');
    let endCount = client.client.listenerCount('end');
    let closeCount = client.client.listenerCount('close');
    let errorCount = client.client.listenerCount('error');
    expect(endCount).to.equal(2);
    expect(closeCount).to.equal(2);
    expect(errorCount).to.equal(2);
    removeTempListeners(client, listeners, 'tl-test');
    listeners = null;
    expect(client.client.listenerCount('end')).to.equal(endCount - 1);
    expect(client.client.listenerCount('close')).to.equal(closeCount - 1);
    return expect(client.client.listenerCount('error')).to.equal(errorCount - 1);
  });

  it('bad listener array test', function () {
    return expect(() => {
      removeTempListeners(client, null, 'tl-test');
    }).to.throw(Error);
  });
});

describe('20utils F: localExists tests', function () {
  before('setup', function () {
    symlinkSync(
      `${config.localUrl}/test-file1.txt`,
      `${config.localUrl}/test-file1-link.txt`,
    );
  });

  after('cleanup', function () {
    unlinkSync(`${config.localUrl}/test-file1-link.txt`);
  });

  it('file exists', function () {
    let path = `${config.localUrl}/test-file1.txt`;
    return expect(localExists(path)).to.equal('-');
  });

  it('directory exists', function () {
    return expect(localExists(config.localUrl)).to.equal('d');
  });

  it('thow error for bad target', function () {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    let fn = () => {
      localExists('/dev/tty');
    };
    return expect(fn).to.throw(/Bad path/);
  });
});

describe('20utils G: haveLocalAccess tests', function () {
  it('have local read access', function () {
    return expect(haveLocalAccess(`${config.localUrl}/test-file1.txt`).status).to.equal(
      true,
    );
  });

  it('have local writ4e access', function () {
    return expect(
      haveLocalAccess(`${config.localUrl}/test-file1.txt`, 'w').status,
    ).to.equal(true);
  });

  it('not have local read access', function () {
    return expect(haveLocalAccess(`${config.localUrl}/no-access.txt`).status).to.equal(
      false,
    );
  });

  it('not have local write access', function () {
    return expect(
      haveLocalAccess(`${config.localUrl}/no-access.txt`, 'w').status,
    ).to.equal(false);
  });

  it('not exist local access', function () {
    return expect(haveLocalAccess(`${config.localUrl}/not-exist.txt`).status).to.equal(
      false,
    );
  });
});

describe('20utils H: haveLocalCreate tests', function () {
  it('local create with file', function () {
    return expect(haveLocalCreate(`${config.localUrl}/test-file1.txt`).status).to.equal(
      true,
    );
  });

  it('local create with directory', function () {
    return expect(haveLocalCreate(config.localUrl).status).to.equal(true);
  });

  it('local create with non-existing file', function () {
    return expect(haveLocalCreate(`${config.localUrl}/no-exist.txt`).status).to.equal(
      true,
    );
  });

  it('local create with no permission', function () {
    return expect(haveLocalCreate(`${config.localUrl}/no-access.txt`).details).to.equal(
      'permission denied',
    );
  });

  it('local create bad dir 1', function () {
    return expect(haveLocalCreate(`${config.localUrl}/bar/foo.txt`).status).to.equal(
      false,
    );
  });

  it('local create bad dir 2', function () {
    return expect(
      haveLocalCreate(`${config.localUrl}/no-access.txt/foo.txt`).status,
    ).to.equal(false);
  });

  it('local create bad dir 3', function () {
    return expect(
      haveLocalCreate(`${config.localUrl}/test-file1.txt/foo.txt`).status,
    ).to.equal(false);
  });
});

describe('20utils I: hasConnection tests', function () {
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
    return expect(haveConnection(client, 'Test1')).to.equal(true);
  });

  it('no connection throws error', async function () {
    await client.end();
    let fn = () => {
      expect(haveConnection(client, 'Test2'));
    };
    return expect(fn).to.throw(/No SFTP connection/);
  });

  it('Promise rejected', function () {
    let p = new Promise((_, reject) => {
      haveConnection(client, 'Test3', reject);
    });
    return expect(p).to.be.rejectedWith(/No SFTP connection/);
  });
});

describe('20utils J: normalize path', function () {
  it('test normalizepath wiht no connection', function () {
    let client = new SftpClient('testing');
    return expect(normalizeRemotePath(client, '.')).to.eventually.be.rejected;
  });
});

describe('20utils K: sleep', function () {
  it('sleep ok', async function () {
    return expect(sleep(10)).to.eventually.equal(true);
  });

  it('sleep error', function () {
    return expect(sleep('bad value')).to.be.rejected;
  });
});

describe('20utils L: partitoin', function () {
  let i = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let i2 = [0, 1, 2, 3, 4];

  it('partiton normal array', function () {
    let o = partition(i, 2);
    expect(o.length).to.equal(5);
    expect(o[0]).to.eql([0, 1]);
    return expect(o[4]).to.eql([8, 9]);
  });

  it('partiton odd array', function () {
    let o = partition(i2, 2);
    expect(o.length).to.equal(3);
    expect(o[0]).to.eql([0, 1]);
    return expect(o[2]).to.eql([4]);
  });

  it('partiotn 0 size', function () {
    return expect(() => {
      partition(i, 0);
    }).to.throw(/Partition size must be greater than zero/);
  });

  it('partition size 1', function () {
    let o = partition(i2, 1);
    expect(o.length).to.equal(5);
    expect(o[0]).to.eql([0]);
    return expect(o[4]).to.eql([4]);
  });

  it('partitoin same size as input', function () {
    let o = partition(i2, i2.length);
    expect(o.length).to.equal(1);
    return expect(o[0]).to.eql(i2);
  });
});
