'use strict';

const {join} = require('path');

async function putCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'put-large.txt'));
    await client.delete(join(sftpUrl, 'put-promise.txt'));
    await client.delete(join(sftpUrl, 'put-buffer.txt'));
    await client.delete(join(sftpUrl, 'put-stream.txt'));
    await client.delete(join(sftpUrl, 'put-relative1-gzip.txt.gz'));
    await client.delete(join(sftpUrl, 'put-relative2-gzip.txt.gz'));
    await client.delete(join(sftpUrl, 'put-relative3-gzip.txt.gz'));
    await client.delete(join(sftpUrl, 'put-relative4-gzip.txt.gz'));
    return true;
  } catch (err) {
    console.error(`putCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  putCleanup
};
