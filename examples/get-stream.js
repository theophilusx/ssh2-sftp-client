'use strict';

// Script reads path to remote file on sftp server, uses sftp.get()
// to retrieve the file and then uses a pass through stream to pipe
// the contents to standard out.

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const Client = require('../src/index.js');
const { PassThrough } = require('node:stream');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const sftp = new Client();

// It is assumed this file already exists on the remote server
let remotePath = process.argv[2];

async function main() {
  try {
    await sftp.connect(config);
    console.log('connection established');
    const pt = new PassThrough();
    const os = pt.pipe(process.stdout);
    await sftp.get(remotePath, os);
    console.log('File retrieved');
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await sftp.end();
    console.log('conneciton closed');
  }
}

try {
  await main();
} catch (err) {
  console.log(err);
}
