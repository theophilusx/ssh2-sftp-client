'use strict';

// sample mkdir use
// Usage: node ./mkdir.js <remote dir path> [debug]

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

const targetPath = process.argv[2];
const debug = process.argv[3] ? true : false;

let client = new Client();

if (debug) {
  console.log('Debugging enabled');
  config.debug = (data) => {
    console.log(`DEBUG: ${data}`);
  };
}

client
  .connect(config)
  .then(() => {
    console.log('Connected. Check if dir already exists');
    return client.exists(targetPath);
  })
  .then((alreadyExists) => {
    if (alreadyExists) {
      console.log(`Path ${targetPath} already exists!`);
      return false;
    } else {
      console.log('Making directory');
      return client.mkdir(targetPath, true);
    }
  })
  .then(() => {
    console.log('Directory created');
    return client.end();
  })
  .catch((err) => {
    console.log(`Error: ${err.message}`);
    client.end();
  });
