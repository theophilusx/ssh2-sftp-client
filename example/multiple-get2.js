'use strict';

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import { join } from 'path';
import Client from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const client = new Client();
const remotePath = '/home/tim/testDownload';
const localPath = '/tmp';

client
  .connect(config)
  .then(() => {
    return client.list(remotePath);
  })
  .then((listing) => {
    let promises = [];
    // WARNING! This will blow up if the remote directory has too many files because
    // each get creates event listeners and node as a warning mechanism to alert you
    // to possible memory leaks if it sees more than a certain number of event handlers. Also,
    // if you create too many promises, you will just run out of resources. One simple solution
    // is to partition the file list into 'doable' size groups. See sftp.downloadDir() for example.
    for (let item of listing) {
      let remoteFile = join(remotePath, item.name);
      let localFile = join(localPath, item.name);
      console.log(`Remote: ${remoteFile} Local: ${localFile}`);
      promises.push(client.get(remoteFile, localFile));
    }
    return Promise.all(promises);
  })
  .then((rslts) => {
    rslts.forEach((r) => console.log(`${r} downlaoded`));
    return client.end();
  })
  .catch((err) => {
    console.log(`Error: ${err.message}`);
  });
