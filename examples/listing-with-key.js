'use stgrict';

// Simple script to produce a directory listing of a remote sftp directory
// with error checking and using a key and passphrase to control access.

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const { readFileSync } = require('node:fs');
const Client = require('../src/index.js');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  privateKey: readFileSync(process.env.SFTP_KEY_FILE),
  passphrase: process.env.SFTP_KEY_PASSPHRASE,
  port: process.env.SFTP_PORT || 22,
  // debug: (msg) => {
  //   console.log(msg);
  // },
};

const sftp = new Client();
try {
  const remoteDir = process.argv[2];
  console.log(`Remote Directory: ${remoteDir}`);
  await sftp.connect(config);
  console.log('Connected....');
  const dirExists = await sftp.exists(remoteDir);
  if (!dirExists) {
    throw new Error(`Bad path: ${remotePath} does not exist`);
  }
  if (dirExists && dirExists !== 'd') {
    throw new Error(`Bad path: ${remoteDir} exists, but is not a directory object`);
  }
  const listing = await sftp.list(remoteDir);
  console.log('Remote listing....');
  console.dir(listing);
} catch (err) {
  console.error(err);
} finally {
  await sftp.end();
}
