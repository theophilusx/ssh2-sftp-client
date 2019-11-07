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

const targetPath = process.argv[2];

let client = new Client();

client
  .connect(config)
  .then(() => {
    console.log('Connected. Check if dir already exists');
    return client.exists(targetPath);
  })
  .then(alreadyExists => {
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
  .catch(err => {
    console.log(`Error: ${err.message}`);
    client.end();
  });
