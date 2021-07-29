'use strict';

// Example of using the uploadDir() method to upload a directory
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
  const src = path.join(__dirname, '..', 'test', 'testData', 'upload-src');
  const dst = '/home/tim/upload-test';

  try {
    await client.connect(config);
    client.on('upload', info => {
      console.log(`Listener: Uploaded ${info.source}`);
    });
    let rslt = await client.uploadDir(src, dst);
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
