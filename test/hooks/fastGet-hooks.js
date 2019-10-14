'use strict';

const {makeLocalPath, makeRemotePath} = require('./global-hooks');
const fs = require('fs');

async function fastGetSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(
      Buffer.from('fastGet promise test'),
      makeRemotePath(sftpUrl, 'fastget-promise.txt')
    );
    await client.put(
      Buffer.from('fast get small file'),
      makeRemotePath(sftpUrl, 'fastget-small.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      makeRemotePath(sftpUrl, 'fastget-large.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      makeRemotePath(sftpUrl, 'fastget-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`fastGetSetup: ${err.message}`);
    return false;
  }
}

async function fastGetCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'fastget-promise.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'fastget-small.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'fastget-large.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'fastget-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-promise.txt'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-small.txt'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-large.txt'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-relative1-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-relative2-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-relative3-gzip.txt.gz'));
    fs.unlinkSync(makeLocalPath(localUrl, 'fastget-relative4-gzip.txt.gz'));
    return true;
  } catch (err) {
    console.error(`fastGetCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastGetSetup,
  fastGetCleanup
};
