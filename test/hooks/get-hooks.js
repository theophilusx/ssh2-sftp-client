'use strict';

const {join} = require('path');
const fs = require('fs');

async function getSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(
      Buffer.from('Get promise test'),
      join(sftpUrl, 'get-promise.txt'),
      {
        encoding: 'utf8'
      }
    );
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'get-large.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'get-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`getSetup: ${err.message}`);
    return false;
  }
}

async function getCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(join(sftpUrl, 'get-promise.txt'));
    await client.delete(join(sftpUrl, 'get-large.txt'));
    await client.delete(join(sftpUrl, 'get-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'get-large.txt'));
    fs.unlinkSync(join(localUrl, 'get-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'get-unzip.txt'));
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
