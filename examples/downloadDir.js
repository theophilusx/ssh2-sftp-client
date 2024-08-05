'use strict';

// Example of using the downloadDir() method to download a directory
// from a remote SFTP server to a local directory

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const SftpClient = require('../src/index.js');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

async function main() {
  const client = new SftpClient('upload-test');
  const dst = '/tmp';
  const src = '/home/tim/upload-test';

  try {
    await client.connect(config);
    client.on('download', (info) => {
      console.log(`Listener: Download ${info.source}`);
    });
    let rslt = await client.downloadDir(src, dst);
    return rslt;
  } finally {
    client.end();
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
}
