'use strict';

// Issue #204 reported that you cannot upload (put) files with
// a zero length. This script tries to replicate this issue.

const path = require('path');
const SftpClient = require('../src/index');

const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({path: dotenvPath});

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

async function fastPutFiles(client, src, dst) {
  try {
    for (let f of ['file1', 'file2']) {
      await client.fastPut(
        path.join(src, `${f}.txt`),
        `${dst}${client.remotePathSep}${f}.txt`
      );
      await client.fastPut(
        path.join(src, 'empty-file.txt'),
        `${dst}${client.remotePathSep}${f}.fin`
      );
    }
    console.log('Files uploaded');
  } catch (err) {
    console.error(err.message);
  }
}

async function main() {
  const client = new SftpClient();

  try {
    let srcDir = process.argv[2];
    let dstDir = process.argv[3];
    await client.connect(config);
    await fastPutFiles(client, srcDir, dstDir);
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

main().then(() => {
  console.log('script complete');
});
