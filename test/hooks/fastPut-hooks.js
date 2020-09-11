'use strict';

const fs = require('fs');
const {join} = require('path');

function fastPutSetup(localUrl) {
  fs.mkdirSync(join(localUrl, 'fp-dir'));
  return true;
}

async function fastPutCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(`${sftpUrl}/fastput-promise-test.gz`);
    await client.delete(`${sftpUrl}/fastput-text.txt`);
    await client.delete(`${sftpUrl}/fastput-text.txt.gz`);
    await client.delete(`${sftpUrl}/fastput-relative1-gzip.txt.gz`);
    await client.delete(`${sftpUrl}/fastput-relative2-gzip.txt.gz`);
    await client.delete(`${sftpUrl}/fastput-relative3-gzip.txt.gz`);
    await client.delete(`${sftpUrl}/fastput-relative4-gzip.txt.gz`);
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
