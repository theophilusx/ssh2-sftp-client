'use strict';

/**
 * This script demonstrates uploading data to a remote file using a stream.
 * This example uses async/await rather than promise chains.
 * Note that we are pushing data from a buffer onto a readStream and then
 * passing the readStream to put(). You could just pass the buffer directly.
 * We are using the ReadStream just for demonstration purposes
 */
const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const { Readable } = require('node:stream');
const Client = require('../src/index');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

let remote = process.argv[2]; // remote path
let debug = process.argv[3]; // enable debugging if argument exists

if (debug) {
  config.debug = (msg) => {
    console.error(msg);
  };
}

/**
 * Upload a buffer of data to a remote file on sftp server.
 * We define this as a separate function because we want to separate it
 * from connecting because connecting is a very slow process and we may want
 * to upload more than one buffer of data. We don't want to make a new connection
 * for every upload as that would be much slower
 */
async function uploadData(client, buf, remotePath) {
  try {
    console.log(`Uploading data to ${remotePath}`);
    let rs = new Readable();
    rs.push(buf);
    rs.push(null);
    let rslt = await client.put(rs, remotePath);
    console.log(`Result: ${rslt}`);
    // verify file was created
    let fileStat = await client.stat(remotePath);
    console.log(`File Stat: ${JSON.stringify(fileStat, null, ' ')}`);
  } catch (err) {
    throw new Error(`uploadData: ${err.message}`);
  }
}

async function main() {
  const sftp = new Client();

  try {
    await sftp.connect(config);
    let buf = Buffer.from('this is the data to be uploaded');
    await uploadData(sftp, buf, remote);
    console.log('Upload completed');
  } catch (err) {
    throw new Error(`main: ${err.message}`);
  } finally {
    await sftp.end();
    console.log('conneciton closed');
  }
}

main().catch((err) => {
  console.error(err);
});
