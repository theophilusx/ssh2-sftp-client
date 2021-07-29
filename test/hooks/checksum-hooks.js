'use strict';

const {join} = require('path');
const fs = require('fs');

function checksumCleanup(client, sftpUrl, localUrl) {
  return client
    .delete(join(sftpUrl, 'checksum-file1.txt'))
    .then(() => {
      return client.delete(join(sftpUrl, 'checksum-file2.txt.gz'));
    })
    .then(() => {
      fs.unlinkSync(join(localUrl, 'checksum-file1.txt'));
      fs.unlinkSync(join(localUrl, 'checksum-file2.txt.gz'));
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
}

module.exports = {
  checksumCleanup
};
