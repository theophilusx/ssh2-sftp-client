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
  beforeEach(async function () {
    return new Promise((resolve, reject) => {
      try {
        setTimeout(function () {
          resolve(true);
        }, 1000);
      } catch (err) {
        reject(err);
      }
    });
  });

  it('contest-1: connect should return a promise', function () {
    let client = new Client('contest-1');
    return expect(
      client.connect(config).then(() => {
        return client.end();
      })
    ).to.be.a('promise');
  });

  it('contest-2: valid connection object', async function () {
    let client = new Client('contest-2');
    await client.connect(config);
    let type = typeof client.sftp;
    await client.end();
    return expect(type).to.equal('object');
  });

  it('contest-3: bad host throws exception', function () {
    let client = new Client('contest-3');
    return expect(
      client.connect({
        ...config,
        host: 'bogus-host.com',
      })
    ).to.be.rejectedWith(
      /Address lookup failed|Timed out while waiting for handshake|read ECONNRESET/
    );
  });

  it('contest-4: bad port throws exception', function () {
    let client = new Client('contest-4');
    return expect(
      client.connect({
        ...config,
        port: 21,
      })
    ).to.be.rejectedWith(
      /refused connection|Timed out while waiting for handshake/
    );
  });

  it('contest-5: bad username throws exception', function () {
    let client = new Client('contest-5');
    return expect(
      client.connect({
        ...config,
        username: 'fred',
      })
    ).to.be.rejectedWith(
      /All configured authentication methods failed|Timed out while waiting for handshake|connect: connect EHOSTUNREACH|connect: Remote host has reset the connection/
    );
  });

  it('contest-6: bad password throws exception', function () {
    let client = new Client('contest-6');
    return expect(
      client.connect({
        ...config,
        password: 'foobar',
      })
    ).to.be.rejectedWith(
      /All configured authentication methods failed|Timed out while waiting for handshake|connect: Remote host has reset the connection/
    );
  });
});

describe('contest-7: Connect and disconnect', function () {
  it('connect and disconnect returns true', function () {
    let client = new Client('contest-7');
    return expect(
      client.connect(config).then(() => {
        return client.end();
      })
    ).to.eventually.equal(true);
  });

  it('contest-8: Connect when connected rejected', function () {
    let client = new Client('contest-8');
    return expect(
      client.connect(config).then(() => {
        return client.connect(config);
      })
    ).to.be.rejectedWith(/An existing SFTP connection is already defined/);
  });
});
