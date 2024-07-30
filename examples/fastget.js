'use strict';

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import SftpClient from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

async function downloadFile(client, src, dst) {
  const fileExists = await client.exists(src);
  if (fileExists) {
    console.log(`Remote file found: ${src}`);
    await client.fastGet(src, dst);
    console.log('File downloaded');
  } else {
    console.log(`Remote file does not exist: ${src}`);
  }
}

async function main() {
  const client = new SftpClient();

  try {
    let srcPath = process.argv[2];
    let dstPath = process.argv[3];
    await client.connect(config);
    await downloadFile(client, srcPath, dstPath);
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (err) {
  console.log(err);
}
