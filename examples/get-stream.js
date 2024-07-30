'use strict';

// Script reads path to remote file on sftp server, uses sftp.get()
// to retrieve the file and then uses a pass through stream to pipe
// the contents to standard out.

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import Client from '../src/index.js';
import { PassThrough } from 'node:stream';

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
