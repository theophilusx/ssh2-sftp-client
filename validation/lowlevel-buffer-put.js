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

const client = new Client();

const size = parseInt(process.argv[2]);
const remotePath = process.argv[3];

client
  .on('ready', function () {
    client.sftp(function (err, sftp) {
      if (err) {
        console.log(`Error: ${err.message}`);
      } else {
        let stream = sftp.createWriteStream(remotePath, {encoding: null});
        stream.on('error', (err) => {
          console.log(`Stream Error: ${err.message}`);
          client.end();
        });
        stream.on('finish', () => {
          console.log(`File successfully uploaded to ${remotePath}`);
          client.end();
        });
        let bufSize = 1024 * size;
        let buf = Buffer.alloc(bufSize);
        console.log(`Uploading buffer of ${bufSize} bytes to ${remotePath}`);
        stream.end(buf);
      }
    });
  })
  .on('error', function (err) {
    console.error(err.message);
  })
  .connect(config);
