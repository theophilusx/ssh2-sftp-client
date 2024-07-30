'use strict';

// Simple script showing how you can pass in a buffer of data to the
// put method to habe it uploaded as a file to the remote sftp server.
// Expects at least 1 argument, name of remote file used as the target.
// Optional second argument is a boolean flag used to turn on debugging.

const path = require('node:path');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const { argv, env, exit } = require('node:process');
const Client = require('../src/index');

const config = {
  host: env.SFTP_SERVER,
  username: env.SFTP_USER,
  password: env.SFTP_PASSWORD,
  port: env.SFTP_PORT || 22,
};

if (argv.length < 3) {
  console.log('Wrong # args');
  console.log('Usage: node ./buffer-put.js <remote path> [debug]');
  console.log(
    '\nwhere:\n\tremote path = file path for upload\n\tdebug = turn on debugging',
  );
  exit(1);
}

const sftp = new Client();

let remote = argv[2];
let debug = argv[3];

if (debug) {
  config.debug = (msg) => {
    console.log(msg);
  };
}

sftp
  .connect(config)
  .then(() => {
    let sampleStr =
      'test data 0 test data 1 test data 2 test data 3 test data 4 test data 5 test data 6 test data 7 test data 8 test data 9';
    console.log(`Sample length: ${sampleStr.length}`);
    let content = '';
    for (let i = 0; i < 1000; i++) {
      content += sampleStr;
    }
    console.log(`Content length: ${content.length}`);
    return sftp.put(Buffer.from(content), remote);
  })
  .then(() => {
    console.log('uploaded');
    return sftp.stat(remote);
  })
  .then((stats) => {
    console.log(`Remote Size: ${stats.size}`);
    return sftp.end();
  })
  .catch((err) => {
    console.log(err.message);
  });
