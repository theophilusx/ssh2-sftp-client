'use strict';

const {makeLocalPath} = require('./global-hooks');

async function existSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(sftpUrl + '/exist-test-dir');
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      sftpUrl + '/exist-file.txt'
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      sftpUrl + '/exist-test-dir/exist-gzip.txt.gz'
    );
    return true;
  } catch (err) {
    console.error(`existSetup: ${err.message}`);
    return false;
  }
}

async function existCleanup(client, sftpUrl) {
  try {
    await client.delete(sftpUrl + '/exist-file.txt');
    await client.rmdir(sftpUrl + '/exist-test-dir', true);
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
