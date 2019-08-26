'use strict';

const {join} = require('path');

async function listSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(join(sftpUrl, 'mocha-list/dir1'), true);
    await client.mkdir(join(sftpUrl, 'mocha-list/dir2/sub1'), true);
    await client.mkdir(join(sftpUrl, 'mocha-list/empty'), true);
    await client.put(
      Buffer.from('hello file1'),
      join(sftpUrl, 'mocha-list/file1.html'),
      {encoding: 'utf8'}
    );
    await client.put(
      Buffer.from('hello file2'),
      join(sftpUrl, 'mocha-list/file2.md'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'mocha-list/test-file1.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'mocha-list/test-file2.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`listSetup: ${err.message}`);
    return false;
  }
}

async function listCleanup(client, sftpUrl) {
  try {
    await client.rmdir(join(sftpUrl, 'mocha-list'), true);
    return true;
  } catch (err) {
    console.error(`listCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  listSetup,
  listCleanup
};
