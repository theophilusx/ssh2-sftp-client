'use strict';

const {join} = require('path');

function rmdirSetup(client, sftpUrl) {
  return client
    .mkdir(join(sftpUrl, 'mocha'))
    .then(() => {
      return client.mkdir(join(sftpUrl, 'mocha-rmdir/dir1'), true);
    })
    .then(() => {
      return client.mkdir(join(sftpUrl, 'mocha-rmdir/dir2'), true);
    })
    .then(() => {
      return client.mkdir(join(sftpUrl, 'mocha-rmdir/dir3/subdir'), true);
    })
    .then(() => {
      return client.put(
        Buffer.from('hello'),
        join(sftpUrl, 'mocha-rmdir/file1.md'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Rmdir setup hook error: ${err.message}`);
    });
}

module.exports = {
  rmdirSetup
};
