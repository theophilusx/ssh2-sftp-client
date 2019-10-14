'use strict';

const {makeRemotePath} = require('./global-hooks');

async function putCleanup(client, sftpUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'put-large.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'put-promise.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'put-buffer.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'put-stream.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'put-relative1-gzip.txt.gz'));
    await client.delete(makeRemotePath(sftpUrl, 'put-relative2-gzip.txt.gz'));
    await client.delete(makeRemotePath(sftpUrl, 'put-relative3-gzip.txt.gz'));
    await client.delete(makeRemotePath(sftpUrl, 'put-relative4-gzip.txt.gz'));
    return true;
  } catch (err) {
    console.error(`putCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  putCleanup
};
