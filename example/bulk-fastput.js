'use strict';

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import { join } from 'node:path';
import Client from '../src/index.js';
import moment from 'moment';

// simple script used mainly for testing purposes. will download a file
// multiple times and store it locally (with a different suffix for each one).
// Idea is to run 100 or 1000 times. Useful for getting some network stats and
// testing for unreliable networks etc. This version uses fastGet() to do the
// download

const client = new Client();

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

async function uploadTest(remotePath, localPath, repeat) {
  try {
    console.log(`Uploading file ${localPath} ${repeat} times`);
    await client.connect(config);
    for (let i = 0; i < repeat; i++) {
      let remoteFile = join(remotePath, `test-file.${i}`);
      console.log(`Uploading to ${remoteFile}`);
      await client.fastPut(localPath, remoteFile);
    }
    console.log('Upload test complete');
  } catch (err) {
    console.error(`Error raised: ${err.message}`);
  } finally {
    client.end();
  }
}

const srcFile = process.argv[2];
const dstDir = process.argv[3];
const repeatTimes = parseInt(process.argv[4]);
const start = moment();

async function main() {
  console.log(`Test: Upload ${srcFile} ${repeatTimes} into ${dstDir}`);
  await uploadTest(dstDir, srcFile, repeatTimes);
}

main()
  .then(() => {
    let end = moment();
    console.log('Test completed');
    console.log(`Start: ${start.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`End:   ${end.format('YYYY-MM-DD HH:mm:ss')}`);
  })
  .catch((err) => {
    let end = moment();
    console.log(`Unexpected Error: ${err.message}`);
    console.log(`Start: ${start.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`End:   ${end.format('YYYY-MM-DD HH:mm:ss')}`);
  });
