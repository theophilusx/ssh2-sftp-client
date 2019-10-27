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

const remotePath = '/home/tim/testDownload';
const localPath = '/tmp';

client
  .connect(config)
  .then(() => {
    return client.list(remotePath, 'wftpserver*');
  })
  .then(listing => {
    let promises = [];
    for (let item of listing) {
      let remoteFile = path.join(remotePath, item.name);
      let localFile = path.join(localPath, item.name);
      console.log(`Remote: ${remoteFile} Local: ${localFile}`);
      promises.push(client.fastGet(remoteFile, localFile));
    }
    return Promise.all(promises);
  })
  .then(rslts => {
    rslts.forEach(r => console.log(`${r} downlaoded`));
    return client.end();
  })
  .catch(err => {
    console.log(`Error: ${err.message}`);
  });
