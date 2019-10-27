'use strict';

// sample mkdir use

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

const path = '/tmp/testing/abc1/abc2';

let client = new Client();

client
  .connect(config)
  .then(() => {
    console.log('Connected. Check if dir already exists');
    return client.exists(path);
  })
  .then(alreadyExists => {
    if (alreadyExists) {
      console.log(`Path ${path} already exists!`);
      return false;
    } else {
      console.log('Making directory');
      return client.mkdir(path, true);
    }
  })
  .then(rslt => {
    console.log(`Result: ${rslt}`);
    return client.end();
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
  });
