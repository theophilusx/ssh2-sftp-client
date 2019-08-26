'use strict';

const {join} = require('path');
const fs = require('fs');

async function getSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(Buffer.from('hello'), join(sftpUrl, 'mocha-file.md'), {
      encoding: 'utf8'
    });
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'large-file1.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'gzipped-file.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`getSetup: ${err.message}`);
    return false;
  }
}

async function getCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(join(sftpUrl, 'mocha-file.md'));
    await client.delete(join(sftpUrl, 'large-file1.txt'));
    await client.delete(join(sftpUrl, 'gzipped-file.txt.gz'));
    fs.unlinkSync(join(localUrl, 'local-large-file.txt'));
    fs.unlinkSync(join(localUrl, 'local-gizipped-file.txt.gz'));
    fs.unlinkSync(join(localUrl, 'local-gzipped-file.txt'));
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
