'use strict';

const {makeLocalPath, makeRemotePath} = require('./global-hooks');

async function listSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(makeRemotePath(sftpUrl, 'list-test/dir1'), true);
    await client.mkdir(makeRemotePath(sftpUrl, 'list-test/dir2/sub1'), true);
    await client.mkdir(makeRemotePath(sftpUrl, 'list-test/empty'), true);
    await client.put(
      Buffer.from('<title>List Test Data 1</title>'),
      makeRemotePath(sftpUrl, 'list-test/file1.html'),
      {encoding: 'utf8'}
    );
    await client.put(
      Buffer.from('# List Test Data 2'),
      makeRemotePath(sftpUrl, 'list-test/file2.md'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      makeRemotePath(sftpUrl, 'list-test/test-file1.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      makeRemotePath(sftpUrl, 'list-test/test-file2.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`listSetup: ${err.message}`);
    return false;
  }
}

async function listCleanup(client, sftpUrl) {
  try {
    await client.rmdir(makeRemotePath(sftpUrl, 'list-test'), true);
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
