import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Example of using the uploadDir() method to upload a directory
// to a remote SFTP server

import { join } from 'node:path';
const dotenvPath = join(fileURLToPath(new URL('.', import.meta.url)), '..', '.env');
dotenv.config({ path: dotenvPath });
import SftpClient from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const client = new SftpClient('upload-test');
try {
  const src = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'test', 'testData', 'upload-src');
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
