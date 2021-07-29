'use strict';

// simple script used for testing purposes. Will download a file from
// a remote SFTP server multiple i.e. 1000 times. Saves the file locally
// Can set the source file, destination directory and repeat count on the
// command line. This version uses get() as the download method.

const path = require('path');
const Client = require('../src/index');
const moment = require('moment');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const client = new Client();

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

async function downloadTest(remoteFilePath, localDir, repeat) {
  try {
    console.log(`Downloading file ${remoteFilePath} ${repeat} times`);
    await client.connect(config);
    for (let i = 0; i < repeat; i++) {
      let localFile = path.join(localDir, `test-file.${i}`);
      console.log(`Downloading to ${localFile}`);
      await client.get(remoteFilePath, localFile);
    }
    console.log('Donwload test complete');
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
  console.log(`Test: Download ${srcFile} ${repeatTimes} into ${dstDir}`);
  await downloadTest(srcFile, dstDir, repeatTimes);
}

main()
  .then(() => {
    let end = moment();
    console.log('Test completed');
    console.log(`Start: ${start.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`End:   ${end.format('YYYY-MM-DD HH:mm:ss')}`);
  })
  .catch(err => {
    let end = moment();
    console.log(`Unexpected Error: ${err.message}`);
    console.log(`Start: ${start.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`End:   ${end.format('YYYY-MM-DD HH:mm:ss')}`);
  });
