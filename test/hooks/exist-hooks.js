'use strict';

const {makeLocalPath, makeRemotePath} = require('./global-hooks');

async function existSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(makeRemotePath(sftpUrl, 'exist-test-dir'));
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      makeRemotePath(sftpUrl, 'exist-file.txt')
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      makeRemotePath(sftpUrl, 'exist-test-dir', 'exist-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`existSetup: ${err.message}`);
    return false;
  }
}

async function existCleanup(client, sftpUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'exist-file.txt'));
    await client.rmdir(makeRemotePath(sftpUrl, 'exist-test-dir'), true);
    return true;
  } catch (err) {
    console.error(`existCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  existSetup,
  existCleanup
};
