'use strict';

// Test module connect/disconnect

const dotenvPath = __dirname + '/../.env';

require('dotenv').config({path: dotenvPath});

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const Client = require('../src/index.js');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Connect Tests', function() {
  let host = process.env.SFTP_SERVER;
  let port = process.env.SFTP_PORT;
  let username = process.env.SFTP_USER;
  let password = process.env.SFTP_PASSWORD;

  beforeEach(function(done) {
    setTimeout(function() {
      done();
    }, 1000);
  });

  it('connect should return a promise', function() {
    let client = new Client();
    return expect(
      client
        .connect({
          host: host,
          port: port,
          username: username,
          password: password,
          retries: 1
        })
        .then(() => {
          client.end();
        })
    ).to.be.a('promise');
  });

  it('valid connection', async function() {
    let client = new Client();
    await client.connect({
      host: host,
      port: port,
      username: username,
      password: password,
      retries: 1
    });
    let type = typeof client.sftp;
    await client.end();
    return expect(type).to.equal('object');
  });

  it('bad host throws exception', function() {
    let client = new Client();
    return expect(
      client.connect({
        host: 'bogus-host',
        port: port,
        username: username,
        password: password,
        retries: 1
      })
    ).to.be.rejectedWith(
      /Address lookup failed|Timed out while waiting for handshake/
    );
  });

  it('bad port throws exception', function() {
    let client = new Client();
    return expect(
      client.connect({
        host: host,
        port: 21,
        username: username,
        password: password,
        retries: 1
      })
    ).to.be.rejectedWith(
      /refused connection|Timed out while waiting for handshake/
    );
  });

  it('bad username throws exception', function() {
    let client = new Client();
    return expect(
      client.connect({
        host: host,
        port: port,
        username: 'fred',
        password: password,
        retries: 1
      })
    ).to.be.rejectedWith(
      /All configured authentication methods failed|Timed out while waiting for handshake/
    );
  });

  it('bad password throws exception', function() {
    let client = new Client();
    return expect(
      client.connect({
        host: host,
        port: port,
        username: username,
        password: 'foobar',
        retries: 1
      })
    ).to.be.rejectedWith(
      /All configured authentication methods failed|Timed out while waiting for handshake/
    );
  });
});

describe('Connect and disconnect', function() {
  let host = process.env.SFTP_SERVER;
  let port = process.env.SFTP_PORT;
  let username = process.env.SFTP_USER;
  let password = process.env.SFTP_PASSWORD;

  it('connect and disconnect returns true', function() {
    let client = new Client();
    return expect(
      client
        .connect({
          host: host,
          port: port,
          username: username,
          password: password,
          retries: 1
        })
        .then(() => {
          return client.end();
        })
    ).to.eventually.equal(true);
  });

  it('Connect when connected rejected', function() {
    let client = new Client();
    return expect(
      client
        .connect({
          host: host,
          port: port,
          username: username,
          password: password,
          retries: 1
        })
        .then(() => {
          return client.connect({
            host: host,
            port: port,
            username: username,
            password: password,
            retries: 1
          });
        })
    ).to.be.rejectedWith(/An existing SFTP connection is already defined/);
  });
});
