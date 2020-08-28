'use strict';

const fs = require('fs');
const {makeLocalPath} = require('./global-hooks');

async function checksumCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(`${sftpUrl}/checksum-file1.txt`);
    await client.delete(`${sftpUrl}/checksum-file2.txt.gz`);
    fs.unlinkSync(makeLocalPath(localUrl, 'checksum-file1.txt'));
    fs.unlinkSync(makeLocalPath(localUrl, 'checksum-file2.txt.gz'));
    return true;
  } catch (err) {
    console.error(`checksumCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  checksumCleanup
};
