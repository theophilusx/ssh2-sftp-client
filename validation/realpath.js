'use strict';

const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('ssh2');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

const targetPath = process.argv[2];

const client = new Client();

client
  .on('ready', function() {
    client.sftp(function(err, sftp) {
      console.log(`Running realpath on ${targetPath}`);
      if (err) {
        console.log(`Error: ${err.message}`);
      }
      sftp.realpath(targetPath, function(err, absolutePath) {
        if (err) {
          console.log(`Error: ${err.message}`);
        }
        console.log(`${targetPath} maps to ${absolutePath}`);
        client.end();
      });
    });
  })
  .on('error', function(err) {
    console.error(err.message);
  })
  .connect(config);
