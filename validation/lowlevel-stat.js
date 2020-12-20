'use strict';

// Simple script to dump out the return data from a low level call to stat()
// This script only uses the ssh2/ssh2-streams modules - no ssh2-sftp-client

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
  .on('ready', function () {
    client.sftp(function (err, sftp) {
      console.log(`Running stat on ${targetPath}`);
      if (err) {
        console.log(`Error: ${err.message}`);
      }
      sftp.stat(targetPath, function (err, statData) {
        if (err) {
          console.log(`Error: ${err.message}`);
        }
        console.log(`${targetPath} raw stat result`);
        console.dir(statData);
        client.end();
      });
    });
  })
  .on('error', function (err) {
    console.error(err.message);
  })
  .connect(config);
