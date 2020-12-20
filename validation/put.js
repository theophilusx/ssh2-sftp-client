'use strict';

// simple test file using low level put command based only on ssh2 lib

const path = require('path');
const fs = require('fs');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('ssh2');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

const client = new Client();

const sourceFile = process.argv[2];
const remotePath = process.argv[3];

client
  .on('ready', function () {
    client.sftp(function (err, sftp) {
      console.log(`Sending ${sourceFile} to ${remotePath}`);
      if (err) {
        console.log(`Error: ${err.message}`);
        return err;
      }
      let stream = sftp.createWriteStream(remotePath, {encoding: null});
      stream.on('error', (err) => {
        console.log(`Stream Error: ${err.message}`);
        client.end();
      });
      stream.on('finish', () => {
        console.log(`File successfully uploaded to ${remotePath}`);
        client.end();
      });
      let rdr = fs.createReadStream(sourceFile, {encoding: null});
      rdr.on('error', (err) => {
        console.log(`Reader Error: ${err.message}`);
        client.end();
      });
      rdr.pipe(stream);
    });
  })
  .on('error', function (err) {
    console.error(err.message);
  })
  .connect(config);
