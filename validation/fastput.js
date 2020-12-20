'use strict';

// A low level simple fastput script which only uses the underlying
// ssh2 and sftpstreams libraries. Used to isolate issues which may be
// specific to the underlying module libraries from the module itself.

// Put credentials in .env file in repo root and then call the script with
// 2 args src and dst. Script will upload src to dst on remote server.

const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const {Client} = require('ssh2');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
  debug: (msg) => {
    console.log(msg);
  }
};

const options = {
  //mode: 0o777,
  //chunkSize: 32768,
  // concurrency: 1,
  // step: function(total_transferred, chunk, total) {
  //   console.log(
  //     `Total Transferred: ${total_transferred} Chunk: ${chunk}` +
  //       ` Total: ${total}`
  //   );
  // }
};

const src = process.argv[2];
const dst = process.argv[3];

let client = new Client();

client.on('ready', () => {
    client.sftp((err, sftp) => {
      if (err) {
        console.error(`SFTP Error: ${err.message}`);
      } else {
        console.log(`Transferring ${src} to ${dst}`);
        sftp.fastPut(src, dst, options, (err) => {
          if (err) {
            console.error(`fastPut Error: ${err.message}`);
          } else {
            console.log('File uploaded');
          }
          client.end();
        });
      }
    });
  }).on('error', function(err) {
    console.error(err.message);
  }).on('end', () => {
    console.log('End event fired');
  }).on('close', () => {
    console.log('Close event fired');
  }).connect(config);
