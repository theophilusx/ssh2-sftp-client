'use strict';

const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const {Client} = require('ssh2');
const fs = require('fs');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

const client = new Client();

const remotePath = process.argv[2];
const localPath = process.argv[3];

client
  .on('ready', function () {
    console.log('Client ready event fired');
    client.sftp(function (err, sftp) {
      if (err) {
        console.log(`SFTP Error: ${err.message}`);
      } else {
        let sout = fs.createWriteStream(localPath);
        let sin = sftp.createReadStream(remotePath);
        sout.on('error', (err) => {
          console.error(`Write Error: ${err.message}`);
        });
        sin.on('error', (err) => {
          console.error(`Read Error: ${err.message}`);
        });
        sout.on('finish', () => {
          console.log('File dowwload complete');
          console.log('Closing client connection');
          client.end();
        });
        sin.pipe(sout);
      }
    });
  })
  .on('error', function (err) {
    console.error(`Client Error: ${err.message}`);
  })
  .on('end', () => {
    console.log('Client end event fired');
  })
  .on('close', () => {
    console.log('Client close event fired');
  })
  .connect(config);
