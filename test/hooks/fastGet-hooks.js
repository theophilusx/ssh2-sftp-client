'use strict';

const {join} = require('path');
const fs = require('fs');

async function fastGetSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(
      Buffer.from('fastGet promise test'),
      join(sftpUrl, 'fastget-promise.txt')
    );
    await client.put(
      Buffer.from('fast get small file'),
      join(sftpUrl, 'fastget-small.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'fastget-large.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'fastget-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`fastGetSetup: ${err.message}`);
    return false;
  }
}

async function fastGetCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(join(sftpUrl, 'fastget-promise.txt'));
    await client.delete(join(sftpUrl, 'fastget-small.txt'));
    await client.delete(join(sftpUrl, 'fastget-large.txt'));
    await client.delete(join(sftpUrl, 'fastget-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'fastget-promise.txt'));
    fs.unlinkSync(join(localUrl, 'fastget-small.txt'));
    fs.unlinkSync(join(localUrl, 'fastget-large.txt'));
    fs.unlinkSync(join(localUrl, 'fastget-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'fastget-relative1-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'fastget-relative2-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'fastget-relative3-gzip.txt.gz'));
    fs.unlinkSync(join(localUrl, 'fastget-relative4-gzip.txt.gz'));
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
