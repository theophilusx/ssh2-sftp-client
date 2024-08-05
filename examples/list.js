'use strict';

// Simple script which just display a directory listing for a
// remote sftp directory specified on the command line

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const Client = require('../src/index.js');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

try {
  const sftp = new Client();
  const remotePath = process.argv[2];
  await sftp.connect(config);
  const fileList = await sftp.list(remotePath);
  console.dir(fileList);
  await sftp.end();
  console.log('script finished');
} catch (err) {
  console.error(err);
}
