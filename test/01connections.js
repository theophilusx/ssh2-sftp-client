'use strict';

// Test module connect/disconnect

const dotenvPath = __dirname + '/../.env';

require('dotenv').config({path: dotenvPath});

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const Client = require('../src/index.js');
const {config} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Connect Tests', function () {
  beforeEach(function () {
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

  it('connect should return a promise', async function () {
    let client = new Client('contest-1');
    return expect(
      client.connect(config).then(() => {
        client.end();
      })
    ).to.be.a('promise');
  });

  it('valid connection', async function () {
    let client = new Client('contest-2');
    await client.connect(config);
    let type = typeof client.sftp;
    await client.end();
    return expect(type).to.equal('object');
  });

  it('bad host throws exception', function () {
    let client = new Client('contest-3');
    return expect(
      client.connect({
        host: 'bogus-host.com',
        port: config.port,
        username: config.username,
        password: config.password,
        retries: config.retries,
        debug: config.debug
      })
    ).to.be.rejectedWith(
      /Address lookup failed|Timed out while waiting for handshake|read ECONNRESET/
    );
  });

  it('bad port throws exception', function () {
    let client = new Client('contest-4');
    return expect(
      client.connect({
        host: config.host,
        port: 21,
        username: config.username,
        password: config.password,
        retries: config.retries,
        debug: config.debug
      })
    ).to.be.rejectedWith(
      /refused connection|Timed out while waiting for handshake/
    );
  });

  it('bad username throws exception', function () {
    let client = new Client('contest-5');
    return expect(
      client.connect({
        host: config.host,
        port: config.port,
        username: 'fred',
        password: config.password,
        retries: config.retries,
        debug: config.debug
      })
    ).to.be.rejectedWith(
      /All configured authentication methods failed|Timed out while waiting for handshake|connect: connect EHOSTUNREACH|connect: Remote host has reset the connection/
    );
  });

  it('bad password throws exception', function () {
    let client = new Client('contest-6');
    return expect(
      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: 'foobar',
        retries: config.retries,
        debug: config.debug
      })
    ).to.be.rejectedWith(
      /All configured authentication methods failed|Timed out while waiting for handshake|connect: Remote host has reset the connection/
    );
  });
});

describe('Connect and disconnect', function () {
  it('connect and disconnect returns true', async function () {
    let client = new Client();
    return expect(
      client.connect(config).then(() => {
        return client.end();
      })
    ).to.eventually.equal(true);
  });

  it('Connect when connected rejected', function () {
    let client = new Client();
    return expect(
      client.connect(config).then(() => {
        return client.connect(config);
      })
    ).to.be.rejectedWith(/An existing SFTP connection is already defined/);
  });
});
