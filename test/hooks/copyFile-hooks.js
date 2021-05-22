'use strict';

const fs = require('fs');
const { makeLocalPath } = require('./global-hooks');

async function copyFileSetup(client, sftpUrl, localUrl) {
  try {
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      sftpUrl + '/copyFile-large.txt',
      { encoding: 'utf8' }
    );
    await client.put(
      Buffer.from('File already exists'),
      sftpUrl + '/copyFile-already-exists.txt',
      {
        encoding: 'utf8',
      }
    );
    return true;
  } catch (err) {
    console.error(`copyFileSetup: ${err.message}`);
    return false;
  }
}

async function copyFileCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(sftpUrl + '/copyFile-large.txt');
    await client.delete(sftpUrl + '/copyFile-already-exists.txt');
    await client.delete(sftpUrl + '/copyFile-large.txt.gz');
    await client.delete(sftpUrl + '/copyFile-large-copy.txt');
    fs.unlinkSync(makeLocalPath(localUrl, 'copyFile-unzip.txt'));
    return true;
  } catch (err) {
    console.error(`copyFileCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  copyFileSetup,
  copyFileCleanup,
};
