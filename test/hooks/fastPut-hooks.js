'use strict';

const {join} = require('path');

async function fastPutCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'fastput-promise-test.gz'));
    await client.delete(join(sftpUrl, 'fastput-text.txt'));
    await client.delete(join(sftpUrl, 'fastput-text.txt.gz'));
    // await client.delete(join(sftpUrl, 'mocha-fastput.md'));
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastPutCleanup
};
