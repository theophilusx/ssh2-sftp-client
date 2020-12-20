#!/usr/bin/env node

'use strict';

// A low level simple fastget script which only uses the underlying
// ssh2 and sftpstreams libraries. Used to isolate issues which may be
// specific to the underlying module libraries from the module itself.

// Put credentials in .env file in repo root and then call the script with
// 2 args src and dst. Script will upload src to dst on remote server.

const path = require('path');
const Client = require('ssh2');

const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({path: dotenvPath});

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

const srcFile = process.argv[2];
const dstDir = process.argv[3];
const repeatCount = parseInt(process.argv[4]);
let run = 0;

let client = new Client();

function doFastGet(client, sftp) {
  let dstFile = path.join(dstDir, `test-file.${run}`);
  console.log(`transferring file ${run}`);
  sftp.fastGet(srcFile, dstFile, err => {
    if (err) {
      console.error(`fastGet error: ${err.message}`);
      return -1;
    } else {
      run++;
      if (run < repeatCount) {
        return doFastGet(client, sftp);
      } else {
        client.end();
        return 0;
      }
    }
  });
}

client
  .on('ready', function() {
    client.sftp(function(err, sftp) {
      if (err) {
        console.log(`Error initialising SFTP object: ${err.message}`);
        return -1;
      }
      console.log(`Transferring ${srcFile} ${repeatCount} times`);
      return doFastGet(client, sftp);
    });
  })
  .on('error', function(err) {
    console.error(`Client emitted error: ${err.message}`);
  })
  .on('end', function() {
    console.log('The connection has been ended');
  })
  .on('close', function() {
    console.log('The connection has been closed');
  })
  .on('uncaughtException', function(err) {
    console.error(`An uncaught exception was emitted: ${err.message}`);
  })
  .connect(config);
