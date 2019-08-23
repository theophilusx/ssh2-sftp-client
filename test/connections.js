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
  let client = new Client();

  afterEach('Cleanup', function() {
    client.end();
  });

  it('connect should return a promise', function() {
    return expect(
      client.connect({
        host: host,
        port: port,
        username: username,
        password: password
      })
    ).to.be.a('promise');
  });

  it('valid connection', async function() {
    await client.connect({
      host: host,
      port: port,
      username: username,
      password: password
    });
    return expect(client.sftp).to.be.an('object');
  });

  it('bad host throws exception', function() {
    return expect(
      client.connect({
        host: 'bogus-host',
        port: port,
        username: username,
        password: password
      })
    ).to.be.rejectedWith('getaddrinfo ENOTFOUND');
  });

  it('bad port throws exception', function() {
    return expect(
      client.connect({
        host: host,
        port: 21,
        username: username,
        password: password
      })
    ).to.be.rejectedWith('connect ECONNREFUSED');
  });

  it('bad username throws exception', function() {
    return expect(
      client.connect({
        host: host,
        port: port,
        username: 'fred',
        password: password
      })
    ).to.be.rejectedWith('All configured authentication methods failed');
  });

  it('bad password throws exception', function() {
    return expect(
      client.connect({
        host: host,
        port: port,
        username: username,
        password: 'foobar'
      })
    ).to.be.rejectedWith('All configured authentication methods failed');
  });
});
