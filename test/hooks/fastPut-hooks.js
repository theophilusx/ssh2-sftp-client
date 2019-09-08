'use strict';

const {join} = require('path');

async function fastPutCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'fastput-promise-test.gz'));
    await client.delete(join(sftpUrl, 'fastput-text.txt'));
    await client.delete(join(sftpUrl, 'fastput-text.txt.gz'));
    await client.delete(join(sftpUrl, 'fastput-relative1-gzip.txt.gz'));
    await client.delete(join(sftpUrl, 'fastput-relative2-gzip.txt.gz'));
    await client.delete(join(sftpUrl, 'fastput-relative3-gzip.txt.gz'));
    await client.delete(join(sftpUrl, 'fastput-relative4-gzip.txt.gz'));
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastPutCleanup
};
