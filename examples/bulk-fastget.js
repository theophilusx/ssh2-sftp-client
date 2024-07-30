// simple script used mainly for testing purposes. will download a file
// multiple times and store it locally (with a different suffix for each one).
// Idea is to run 100 or 1000 times. Useful for getting some network stats and
// testing for unreliable networks etc. This version uses fastGet() to do the
// download

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const { argv, env, exit } = require('node:process');

const Client = require('../src/index');
const moment = require('moment');

const client = new Client();

const config = {
  host: env.SFTP_SERVER,
  username: env.SFTP_USER,
  password: env.SFTP_PASSWORD,
  port: env.SFTP_PORT || 22,
};

async function downloadTest(remoteFilePath, localDir, repeat) {
  try {
    console.log(`Downloading file ${remoteFilePath} ${repeat} times`);
    await client.connect(config);
    for (let i = 0; i < repeat; i++) {
      let localFile = join(localDir, `test-file.${i}`);
      console.log(`Downloading to ${localFile}`);
      await client.fastGet(remoteFilePath, localFile);
    }
    console.log('Donwload test complete');
  } catch (err) {
    console.error(`Error raised: ${err.message}`);
  } finally {
    client.end();
  }
}

if (argv.length !== 5) {
  console.log('Wrong # args');
  console.log('Usage: node ./bulk-fastget.js <remote path> <destination dir> <repeat>');
  console.log(
    '\nwhere:\n\tremote path = file path for download\n\tdestination directory\n\trepeat count',
  );
  exit(1);
}

const srcFile = argv[2];
const dstDir = argv[3];
const repeatTimes = parseInt(argv[4]);
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
  .catch((err) => {
    let end = moment();
    console.log(`Unexpected Error: ${err.message}`);
    console.log(`Start: ${start.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`End:   ${end.format('YYYY-MM-DD HH:mm:ss')}`);
  });
