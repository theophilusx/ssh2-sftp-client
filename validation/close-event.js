'use strict';

const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('../src/index');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

async function downloadTest(client, remoteFilePath, localDir, repeat) {
  try {
    console.log(`Downloading file ${remoteFilePath} ${repeat} times`);
    for (let i = 0; i < repeat; i++) {
      let localFile = path.join(localDir, `test-file.${i}`);
      console.log(`Downloading to ${localFile}`);
      await client.fastGet(remoteFilePath, localFile);
      console.log(`${localFile} downloaded`);
    }
    console.log('Donwload test complete');
  } catch (err) {
    console.error(`Error raised: ${err.message}`);
  }
}

async function main() {
  const client = new Client();

  try {
    const srcFile = process.argv[2];
    const dstDir = process.argv[3];
    const repeatTimes = parseInt(process.argv[4]);
    await client.connect(config);
    setTimeout(() => {
      client.client.emit('error', new Error('a fake test error'));
      client.client.emit('close', true);
    }, 1000);
    await downloadTest(client, srcFile, dstDir, repeatTimes);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  } finally {
    client.end();
  }
}

main().catch(err => {
  console.log(err.message);
});
