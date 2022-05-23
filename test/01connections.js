'use strict';

// Test module connect/disconnect

const dotenvPath = __dirname + '/../.env';

require('dotenv').config({ path: dotenvPath });

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const Client = require('../src/index.js');
const { config } = require('./hooks/global-hooks');

//chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Connect Tests', function () {
  // beforeEach(async function () {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       setTimeout(function () {
  //         resolve(true);
  //       }, 1000);
  //     } catch (err) {
  //       reject(err);
  //     }
  //   });
  // });

  it('contest-1: connect should return a promise', function () {
    const client = new Client('contest-1');
    return expect(
      client.connect(config).then(() => {
        return client.end();
      })
    ).to.be.a('promise');
  });

  it('contest-2: valid connection object', async function () {
    const client = new Client('contest-2');
    const sftpChannel = await client.connect(config);
    expect(sftpChannel).to.equal(client.sftp);
    const type = typeof client.sftp;
    await client.end();
    return expect(type).to.equal('object');
  });

  it('contest-3: bad host throws exception', function () {
    const client = new Client('contest-3');
    return expect(
      client.connect({
        ...config,
        host: 'bogus-host.com',
      })
    ).to.be.rejected;
  });

  it('contest-4: bad port throws exception', function () {
    const client = new Client('contest-4');
    return expect(
      client.connect({
        ...config,
        port: 21,
      })
    ).to.be.rejectedWith(/refused connection/);
  });

  it('connect-4b: bad port range throws exception', function () {
    const client = new Client('connect-4b');
    return expect(
      client.connect({
        ...config,
        port: 288642,
      })
    ).to.be.rejectedWith(/Port should be >= 0 and < 65536/);
  });

  it('contest-5: bad username throws exception', function () {
    const client = new Client('contest-5');
    return expect(
      client.connect({
        ...config,
        username: 'fred',
      })
    ).to.be.rejectedWith(/All configured authentication methods failed/);
  });

  it('contest-6: bad password throws exception', function () {
    const client = new Client('contest-6');
    return expect(
      client.connect({
        ...config,
        password: 'foobar',
      })
    ).to.be.rejectedWith(/All configured authentication methods failed/);
  });
});

describe('contest-7: Connect and disconnect', function () {
  it('connect and disconnect returns true', function () {
    const client = new Client('contest-7');
    return expect(
      client.connect(config).then(() => {
        return client.end();
      })
    ).to.eventually.equal(true);
  });

  it('contest-8: Connect when connected rejected', function () {
    const client = new Client('contest-8');
    return expect(
      client.connect(config).then(() => {
        return client.connect(config);
      })
    ).to.be.rejectedWith(/An existing SFTP connection is already defined/);
  });
});
