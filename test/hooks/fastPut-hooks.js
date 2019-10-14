'use strict';

const {makeRemotePath} = require('./global-hooks');

async function fastPutCleanup(client, sftpUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'fastput-promise-test.gz'));
    await client.delete(makeRemotePath(sftpUrl, 'fastput-text.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'fastput-text.txt.gz'));
    await client.delete(
      makeRemotePath(sftpUrl, 'fastput-relative1-gzip.txt.gz')
    );
    await client.delete(
      makeRemotePath(sftpUrl, 'fastput-relative2-gzip.txt.gz')
    );
    await client.delete(
      makeRemotePath(sftpUrl, 'fastput-relative3-gzip.txt.gz')
    );
    await client.delete(
      makeRemotePath(sftpUrl, 'fastput-relative4-gzip.txt.gz')
    );
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastPutCleanup
};
