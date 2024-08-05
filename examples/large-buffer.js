'use strict';

// Example of using a buffer of data as the source data for a sftp.put().
// Note that in most cases you are far better off using a stream rather than
// a buffer.

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const { readFileSync } = require('node:fs');
const Client = require('../src/index.js');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const sftp = new Client();

let localFile = process.argv[2];
let remote = process.argv[3];
let debug = process.argv[4];

if (debug) {
  config.debug = (msg) => {
    console.error(msg);
  };
}

sftp
  .connect(config)
  .then(() => {
    let data = readFileSync(localFile);
    console.log(`Sample length: ${data.length}`);
    return sftp.put(data, remote);
  })
  .then(() => {
    console.log('uploaded data');
    return sftp.stat(remote);
  })
  .then((stats) => {
    console.log(`Remote Size: ${stats.size}`);
    return sftp.end();
  })
  .catch((err) => {
    console.log(err.message);
  });
