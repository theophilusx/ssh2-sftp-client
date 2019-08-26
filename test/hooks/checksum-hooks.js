'use strict';

const {join} = require('path');
const fs = require('fs');

async function checksumCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(join(sftpUrl, 'checksum-file1.txt'));
    await client.delete(join(sftpUrl, 'checksum-file2.txt.gz'));
    fs.unlinkSync(join(localUrl, 'checksum-file1.txt'));
    fs.unlinkSync(join(localUrl, 'checksum-file2.txt.gz'));
    return true;
  } catch (err) {
    console.error(`checksumCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  checksumCleanup
};
