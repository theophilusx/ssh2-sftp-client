'use strict';

// Example of using the downloadDir() method to upload a directory
// to a remote SFTP server

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

async function main() {
  const client = new SftpClient('upload-test');
  const dst = '/tmp';
  const src = '/home/tim/upload-test';

  try {
    await client.connect(config);
    client.on('download', info => {
      console.log(`Listener: Download ${info.source}`);
    });
    let rslt = await client.downloadDir(src, dst);
    return rslt;
  } finally {
    client.end();
  }
}

main()
  .then(msg => {
    console.log(msg);
  })
  .catch(err => {
    console.log(`main error: ${err.message}`);
  });
