'use strict';

const {makeLocalPath, makeRemotePath} = require('./global-hooks');
const fs = require('fs');

async function getSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(
      Buffer.from('Get promise test'),
      makeRemotePath(sftpUrl, 'get-promise.txt'),
      {
        encoding: 'utf8'
      }
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      makeRemotePath(sftpUrl, 'get-large.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      makeRemotePath(sftpUrl, 'get-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`getSetup: ${err.message}`);
    return false;
  }
}

async function getCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'get-promise.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'get-large.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'get-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-large.txt'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-unzip.txt'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-relative1-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-relative2-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-relative3-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'get-relative4-gzip.txt.gz'));
    return true;
  } catch (err) {
    console.error(`getCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  getSetup,
  getCleanup
};
