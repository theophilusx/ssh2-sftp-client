'use strict';

const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('../src/index');
const path = require('path');

const client = new Client();

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

async function downloadAll(remotePath, localPath) {
  console.log(`Downloading files from ${remotePath}`);
  await client.connect(config);
  let listings = await client.list(remotePath, 'wftpserver*');
  for (let item of listings) {
    let remoteFile = path.join(remotePath, item.name);
    let localFile = path.join(localPath, item.name);
    console.log(`Remote: ${remoteFile} Local: ${localFile}`);
    let res = await client.fastGet(remoteFile, localFile);
    console.log(`${res} downloaded`);
  }
  await client.end();
}

downloadAll('/home/tim/testDownload', '/tmp')
  .then(() => {
    console.log('all files downloaded');
  })
  .catch(err => {
    console.log(`An error occured: ${err.message}`);
  });
