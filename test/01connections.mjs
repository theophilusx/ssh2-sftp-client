// import dotenv from 'dotenv';
// const dotenvPath = '../.env';
// dotenv.config({ path: dotenvPath });

import { expect as _expect, use } from 'chai';
const expect = _expect;
import chaiAsPromised from 'chai-as-promised';
import Client from '../src/index.js';
import { config } from './hooks/global-hooks.mjs';

use(chaiAsPromised);

describe('01connection: Connect Tests', function () {
  it('contest-1: connect should return a promise', function () {
    const client = new Client('contest-1');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect(baseConfig).then(() => {
        return client.end();
      }),
    ).to.be.a('promise');
  });

  it('contest-2: valid connection object', async function () {
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    const client = new Client('contest-2');
    const sftpChannel = await client.connect(baseConfig);
    expect(sftpChannel).to.equal(client.sftp);
    const type = typeof client.sftp;
    await client.end();
    return expect(type).to.equal('object');
  });

  it('contest-3: bad host throws exception', function () {
    const client = new Client('contest-3');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect({
        ...baseConfig,
        host: 'bogus-host.com',
      }),
    ).to.be.rejected;
  });

  it('contest-4: bad port throws exception', function () {
    const client = new Client('contest-4');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect({
        ...baseConfig,
        port: 21,
      }),
    ).to.be.rejectedWith(/EHOSTUNREACH/);
  });

  it('connect-4b: bad port range throws exception', function () {
    const client = new Client('connect-4b');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect({
        ...baseConfig,
        port: 288642,
      }),
    ).to.be.rejectedWith(/Port should be >= 0 and < 65536/);
  });

  it('contest-5: bad username throws exception', function () {
    const client = new Client('contest-5');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect({
        ...baseConfig,
        username: 'fred',
      }),
    ).to.be.rejectedWith(/All configured authentication methods failed/);
  });

  it('contest-6: bad password throws exception', function () {
    const client = new Client('contest-6');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect({
        ...baseConfig,
        password: 'foobar',
      }),
    ).to.be.rejectedWith(/All configured authentication methods failed/);
  });
});

describe('01connection B: Connect with key test', function () {
  it('connect with key', async function () {
    const client = new Client('key-connect');
    const keyConfig = { ...config };
    delete keyConfig.password;
    const sftpChannel = await client.connect(keyConfig);
    expect(sftpChannel).to.equal(client.sftp);
    const type = typeof client.sftp;
    await client.end();
    return expect(type).to.equal('object');
  });

  it('fail with bad passphrase', function () {
    const client = new Client('contest-6');
    const baseConfig = { ...config };
    delete baseConfig.password;
    return expect(
      client.connect({
        ...baseConfig,
        passphrase: 'notthepasspharse',
      }),
    ).to.be.rejectedWith(/Cannot parse privateKey/);
  });
});

describe('01connection C: contest-7: Connect and disconnect', function () {
  it('connect and disconnect returns true', function () {
    const client = new Client('contest-7');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect(baseConfig).then(() => {
        return client.end();
      }),
    ).to.eventually.equal(true);
  });

  it('contest-8: Connect when connected rejected', function () {
    const client = new Client('contest-8');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect(baseConfig).then(() => {
        return client.connect(config);
      }),
    ).to.be.rejectedWith(/An existing SFTP connection is already defined/);
  });
});

describe('01connection D: end test', function () {
  it('normal end call', function () {
    const client = new Client('contest-9');
    const baseConfig = { ...config };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    return expect(
      client.connect(baseConfig).then(() => {
        return client.end();
      }),
    ).to.eventually.equal(true);
  });

  it('end when not connected', function () {
    const client = new Client('contest-10');
    return expect(client.end()).to.eventually.equal(true);
  });
});
