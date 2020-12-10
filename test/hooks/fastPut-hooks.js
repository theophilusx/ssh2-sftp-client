'use strict';

const fs = require('fs');
const {join} = require('path');

function fastPutSetup(localUrl) {
  try {
    fs.mkdirSync(join(localUrl, 'fp-dir'));
    return true;
  } catch (err) {
    return true;
  }
}

async function fastPutCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(`${sftpUrl}/fastput-promise-test.gz`, true);
    await client.delete(`${sftpUrl}/fastput-text.txt`, true);
    await client.delete(`${sftpUrl}/fastput-text.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative1-gzip.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative2-gzip.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative3-gzip.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative4-gzip.txt.gz`, true);
    fs.rmdirSync(join(localUrl, 'fp-dir'));
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastPutSetup,
  fastPutCleanup
};
