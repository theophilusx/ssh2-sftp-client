'use strict';

// Example of using the uploadDir() method to upload a directory
// to a remote SFTP server

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import { join } from 'path';
import SftpClient from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const client = new SftpClient('upload-test');
try {
  const src = join(__dirname, '..', 'test', 'testData', 'upload-src');
  const dst = '/home/tim/upload-test';

  await client.connect(config);
  client.on('upload', (info) => {
    console.log(`Listener: Uploaded ${info.source}`);
  });
  let rslt = await client.uploadDir(src, dst);
  console.log(`Result: ${rslt}`);
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
