'use strict';

const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('ssh2');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
  debug: (msg) => {
    if (msg.startsWith('DEBUG[SFTP]')) {
      console.log(`DEBUG: ${msg}`);
    }
  }
};

const client = new Client();

const startSize = parseInt(process.argv[2]);
const maxCount = parseInt(process.argv[3]);
const remotePath = process.argv[4];

let count = 0;

const putBuffer = (con, size) => {
  let bufSize = 1024 * size;
  let buf = Buffer.alloc(bufSize);
  let remoteFile = path.join(remotePath, `test-${size}k.dat`);
  let stream = con.createWriteStream(remoteFile, {encoding: null});
  stream.on('error', (err) => {
    console.log('error event fired');
    console.log(`Stream Error: ${err.message}`);
    count++;
    doRun(con, size + 10);
  });
  stream.on('finish', () => {
    console.log('finish even fired');
    console.log(`File successfully uploaded to ${remoteFile}`);
    count++;
    doRun(con, size + 10);
  });
  stream.on('close', () => {
    console.log('close event fired');
  });
  stream.on('drain', () => {
    console.log('drain event fired');
  });
  stream.on('pipe', () => {
    console.log('pipe event fired');
  });
  stream.on('unpipe', () => {
    console.log('unpipe event fired');
  });
  console.log(`Uploading buffer of ${size}k to ${remoteFile}`);
  stream.write(buf);
  stream.end();
};

const doRun = (con, size) => {
  if (count <= maxCount) {
    putBuffer(con, size);
  } else {
    console.log('Run finished');
    client.end();
  }
};

client
  .on('ready', function () {
    client.sftp(function (err, sftp) {
      if (err) {
        console.log(`Error: ${err.message}`);
      } else {
        doRun(sftp, startSize);
      }
    });
  })
  .on('error', function (err) {
    console.error(err.message);
  })
  .connect(config);
