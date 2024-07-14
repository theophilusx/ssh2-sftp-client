'use strict';

// The 'realpath' functionality varies across sftp servers,
// especdially with respect to handling '.' and '..'

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import Client from '../src/index.js';

const client = new Client();
const targetPath = process.argv[2];

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

client
  .connect(config)
  .then(() => {
    return client.realPath(targetPath);
  })
  .then((absolutePath) => {
    console.log(`${targetPath} maps to ${absolutePath}`);
    //return client.end();
  })
  .catch((err) => {
    console.log(`Error: ${err.message}`);
  })
  .finally(() => {
    return client.end();
  });
