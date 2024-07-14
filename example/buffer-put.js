'use strict';

// Simple script showing how you can pass in a buffer of data to the
// put method to habe it uploaded as a file to the remote sftp server.
// Expects at least 1 argument, name of remote file used as the target.
// Optional second argument is a boolean flag used to turn on debugging.

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import Client from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const sftp = new Client();

let remote = process.argv[2];
let debug = process.argv[3];

if (debug) {
  config.debug = (msg) => {
    console.error(msg);
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
