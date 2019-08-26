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

async function setup() {
  try {
    testEnv.sftp = new Client();
    testEnv.hookSftp = new Client();
    await testEnv.sftp.connect(config);
    await testEnv.hookSftp.connect(config);
    return testEnv;
  } catch (err) {
    console.error(`global setup: ${err.message}`);
    return testEnv;
  }
}

async function closeDown() {
  try {
    await testEnv.sftp.end();
    await testEnv.hookSftp.end();
    return true;
  } catch (err) {
    console.error(`global cleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  setup,
  closeDown
};
