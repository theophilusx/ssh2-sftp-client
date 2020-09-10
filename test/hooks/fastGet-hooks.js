'use strict';

const {makeLocalPath} = require('./global-hooks');
const fs = require('fs');

async function fastGetSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(
      Buffer.from('fastGet promise test'),
      sftpUrl + '/fastget-promise.txt'
    );
    await client.put(
      Buffer.from('fast get small file'),
      sftpUrl + '/fastget-small.txt',
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      sftpUrl + '/fastget-large.txt',
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      sftpUrl + '/fastget-gzip.txt.gz'
    );
    await client.mkdir(`${sftpUrl}/fg-dir`);
    return true;
  } catch (err) {
    console.error(`fastGetSetup: ${err.message}`);
    return false;
  }
}

async function fastGetCleanup(client, sftpUrl, localUrl) {
  try {
    await client.rmdir(`${sftpUrl}/fg-dir`);
    await client.delete(sftpUrl + '/fastget-promise.txt');
    await client.delete(sftpUrl + '/fastget-small.txt');
    await client.delete(sftpUrl + '/fastget-large.txt');
    await client.delete(sftpUrl + '/fastget-gzip.txt.gz');
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
