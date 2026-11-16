// Unit tests for error handling paths. These do not need an SFTP server -
// the ssh2 client and sftp objects are stubbed where required.
import chai from 'chai';
const expect = chai.expect;
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import SftpClient from '../src/index.js';
import {
  errorListener,
  endListener,
  closeListener,
  haveLocalAccess,
  sleep,
} from '../src/utils.js';

chai.use(chaiAsPromised);
chai.use(chaiSubset);

const quiet = { error: () => {}, end: () => {}, close: () => {} };
const newClient = (name) => new SftpClient(name, quiet);

describe('31unit A: fmtError default branch', function () {
  const client = newClient('unit-fmt');

  it('error with an unrecognised code uses the plain message', function () {
    const e = new Error('Something odd');
    e.code = 'EWEIRD';
    expect(client.fmtError(e, 'func')).to.containSubset({
      message: 'func: Something odd',
      code: 'EWEIRD',
      custom: true,
    });
  });

  it('error without a code falls back to the generic client code', function () {
    expect(client.fmtError(new Error('No code'), 'func')).to.containSubset({
      message: 'func: No code',
      code: 'ERR_GENERIC_CLIENT',
    });
  });
});

describe('31unit B: listeners which reject', function () {
  let client;

  beforeEach(function () {
    client = newClient('unit-listeners');
  });

  it('endListener rejects with an unexpected end event', function () {
    const p = new Promise((resolve, reject) => endListener(client, 'EndT', reject)());
    return expect(p).to.be.rejectedWith(/EndT: Unexpected end event/);
  });

  it('endListener clears the sftp object and sets endHandled', async function () {
    client.sftp = {};
    const p = new Promise((resolve, reject) => endListener(client, 'EndT', reject)());
    await expect(p).to.be.rejected;
    expect(client.sftp).to.equal(undefined);
    expect(client.endHandled).to.equal(true);
  });

  it('closeListener rejects with an unexpected close event', function () {
    const p = new Promise((resolve, reject) => closeListener(client, 'CloseT', reject)());
    return expect(p).to.be.rejectedWith(/CloseT: Unexpected close event/);
  });

  it('closeListener clears the sftp object and sets closeHandled', async function () {
    client.sftp = {};
    const p = new Promise((resolve, reject) => closeListener(client, 'CloseT', reject)());
    await expect(p).to.be.rejected;
    expect(client.sftp).to.equal(undefined);
    expect(client.closeHandled).to.equal(true);
  });

  it('errorListener clears the sftp object on ECONNRESET', async function () {
    client.sftp = {};
    const e = new Error('reset');
    e.code = 'ECONNRESET';
    const p = new Promise((resolve, reject) => errorListener(client, 'ErrT', reject)(e));
    await expect(p).to.be.rejectedWith(/ErrT: reset/);
    expect(client.sftp).to.equal(undefined);
  });

  it('errorListener ignores ECONNRESET once end() has been called', function () {
    client.sftp = {};
    client.endCalled = true;
    const e = new Error('reset');
    e.code = 'ECONNRESET';
    expect(() => errorListener(client, 'end')(e)).to.not.throw();
    expect(client.errorHandled).to.equal(false);
    expect(client.sftp).to.not.equal(undefined);
  });

  it('errorListener keeps the sftp object for other errors', function () {
    client.sftp = {};
    const e = new Error('other');
    e.code = 'EOTHER';
    expect(() => errorListener(client, 'ErrT')(e)).to.throw(/ErrT: other/);
    expect(client.sftp).to.not.equal(undefined);
  });
});

describe('31unit C: connect() failure while opening the sftp subsystem', function () {
  it('rejects with a formatted error and does not set sftp', async function () {
    const client = newClient('unit-connect');
    client.client.connect = () => client.client.emit('ready');
    client.client.sftp = (cb) => {
      const err = new Error('subsystem refused');
      err.code = 'ESUBSYS';
      cb(err);
    };
    const err = await client.connect({ host: 'stub' }).catch((e) => e);
    expect(err).to.be.instanceOf(Error);
    expect(err.message).to.match(/subsystem refused/);
    expect(err.code).to.equal('ESUBSYS');
    expect(client.sftp).to.equal(undefined);
  });
});

const stubClient = (code) => {
  const client = newClient('unit-realpath');
  client.sftp = {
    realpath: (p, cb) => {
      const err = new Error(code === 2 ? 'No such file' : 'Failure');
      err.code = code;
      cb(err);
    },
  };
  return client;
};

describe('31unit D: realPath() errors', function () {
  it('code 2 (no such file) resolves to an empty string', function () {
    return expect(stubClient(2).realPath('/nope', false)).to.eventually.equal('');
  });

  it('other error codes are rejected and include the path', async function () {
    const err = await stubClient(3).realPath('/denied', false).catch((e) => e);
    expect(err).to.be.instanceOf(Error);
    expect(err.message).to.contain('/denied');
    expect(err.code).to.equal(3);
  });
});

describe('31unit E: haveLocalAccess() unknown errors', function () {
  it('a path with a NUL byte returns status false and the error message', function () {
    const r = haveLocalAccess('bad\0path');
    expect(r.status).to.equal(false);
    expect(r.type).to.equal(null);
    expect(r.details).to.be.a('string').and.not.equal('');
    expect(r.details).to.not.equal('access OK');
  });

  it('a non-file, non-directory target returns status false', function () {
    // /dev/null is a character device, which localExists() rejects
    const r = haveLocalAccess('/dev/null');
    expect(r.status).to.equal(false);
    expect(r.details).to.match(/must be a file or directory/);
  });
});

describe('31unit F: sleep() argument errors', function () {
  it('a Symbol argument is rejected rather than thrown', function () {
    return expect(sleep(Symbol('x'))).to.be.rejected;
  });

  it('a negative argument is rejected', function () {
    return expect(sleep(-1)).to.be.rejectedWith(/>= 0/);
  });

  it('a valid argument resolves true', function () {
    return expect(sleep(1)).to.eventually.equal(true);
  });
});
