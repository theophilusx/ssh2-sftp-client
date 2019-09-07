'use strict';

const {join} = require('path');

async function existSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(join(sftpUrl, 'exist-test-dir'));
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'exist-file.txt')
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'exist-test-dir', 'exist-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`existSetup: ${err.message}`);
    return false;
  }
}

async function existCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'exist-file.txt'));
    await client.rmdir(join(sftpUrl, 'exist-test-dir'), true);
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
