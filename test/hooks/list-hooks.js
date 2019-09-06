'use strict';

const {join} = require('path');

async function listSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(join(sftpUrl, 'list-test/dir1'), true);
    await client.mkdir(join(sftpUrl, 'list-test/dir2/sub1'), true);
    await client.mkdir(join(sftpUrl, 'list-test/empty'), true);
    await client.put(
      Buffer.from('<title>List Test Data 1</title>'),
      join(sftpUrl, 'list-test/file1.html'),
      {encoding: 'utf8'}
    );
    await client.put(
      Buffer.from('# List Test Data 2'),
      join(sftpUrl, 'list-test/file2.md'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'list-test/test-file1.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'list-test/test-file2.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`listSetup: ${err.message}`);
    return false;
  }
}

async function listCleanup(client, sftpUrl) {
  try {
    await client.rmdir(join(sftpUrl, 'list-test'), true);
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
