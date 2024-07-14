'use strict';

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import { join } from 'node:path';
import SftpClient from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

async function putFiles(client, src, dst) {
  try {
    console.log(`Uploading ${src} to ${dst}`);
    await client.fastPut(src, dst);
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
    await putFiles(client, srcDir, dstDir);
    for (let f of ['file1', 'file2']) {
      await client.put(join(src, `${f}.txt`), `${dst}${client.remotePathSep}${f}.txt`);
      await client.put(
        join(src, 'empty-file.txt'),
        `${dst}${client.remotePathSep}${f}.fin`,
      );
    }
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
