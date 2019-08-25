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

function setup() {
  return testEnv.sftp
    .connect(config)
    .then(() => {
      return testEnv.hookSftp.connect(config);
    })
    .then(() => {
      return testEnv;
    })
    .catch(err => {
      Promise.reject(`global-hooks.setup: ${err.message}`);
    });
}

function closeDown() {
  return testEnv.sftp
    .end()
    .then(() => {
      return testEnv.hookSftp.end();
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      Promise.reject(`global-hook.closeDown: ${err.message}`);
    });
}

module.exports = {
  setup,
  closeDown
};
