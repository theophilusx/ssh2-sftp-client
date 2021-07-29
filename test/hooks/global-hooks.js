'use strict';

const dotenvPath = __dirname + '/../../.env';

require('dotenv').config({path: dotenvPath});

const Client = require('../../src/index.js');
const {join} = require('path');

// use your test ssh server config
const config = {
  host: process.env['SFTP_SERVER'],
  username: process.env['SFTP_USER'],
  password: process.env['SFTP_PASSWORD'],
  port: process.env['SFTP_PORT'] || 22
};

const testEnv = {
  sftp: new Client(),
  hookSftp: new Client(),
  localUrl: join(__dirname, '../testData'),
  sftpUrl: process.env['SFTP_URL']
};

let initialised = false;

function setup() {
  if (!initialised) {
    return testEnv.sftp
      .connect(config, 'once')
      .then(() => {
        return testEnv.hookSftp.connect(config, 'once');
      })
      .then(() => {
        initialised = true;
        return testEnv;
      })
      .catch(err => {
        throw new Error(`Global test setup failed: ${err.message}`);
      });
  }
  return Promise.resolve(testEnv);
}

function closeDown() {
  if (initialised) {
    return testEnv.sftp
      .end()
      .then(() => {
        return testEnv.hookSftp.end();
      })
      .then(() => {
        initialised = false;
        return true;
      })
      .catch(err => {
        throw new Error(`Global test cleanup failed: ${err.message}`);
      });
  }
  return Promise.resolve(true);
}

module.exports = {
  setup,
  closeDown
};
