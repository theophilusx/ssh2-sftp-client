'use strict';

const {makeLocalPath, makeRemotePath} = require('./global-hooks');

async function pathSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(makeRemotePath(sftpUrl, 'path-test-dir'));
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      makeRemotePath(sftpUrl, 'path-test-dir', 'path-file1.txt')
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      makeRemotePath(sftpUrl, 'path-test-dir', 'path-file2.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`pathSetup: ${err.message}`);
    return false;
  }
}

async function pathCleanup(client, sftpUrl) {
  try {
    await client.rmdir(makeRemotePath(sftpUrl, 'path-test-dir'), true);
    return true;
  } catch (err) {
    console.log(`pathClenaup: ${err.message}`);
    return false;
  }
}

module.exports = {
  pathSetup,
  pathCleanup
};
