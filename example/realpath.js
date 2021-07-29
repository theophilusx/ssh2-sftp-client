'use strict';

const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('../src/index');

const client = new Client();
const targetPath = process.argv[2];

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

client
  .connect(config)
  .then(() => {
    return client.realPath(targetPath);
  })
  .then(absolutePath => {
    console.log(`${targetPath} maps to ${absolutePath}`);
    //return client.end();
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
  })
  .finally(() => {
    return client.end();
  });
