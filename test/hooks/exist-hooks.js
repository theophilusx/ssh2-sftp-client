'use strict';

const {join} = require('path');

function existSetup(client, sftpUrl, localUrl) {
  return client
    .mkdir(join(sftpUrl, 'exist-dir'))
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'exist-file.txt')
      );
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Exist method test setup hook failure: ${err.message}`);
    });
}

function existCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'exist-file.txt'))
    .then(() => {
      return client.rmdir(join(sftpUrl, 'exist-dir'));
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Exist method test clenaup hook failed: ${err.message}`);
    });
}

module.exports = {
  existSetup,
  existCleanup
};
