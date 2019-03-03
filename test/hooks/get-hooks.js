'use strict';

const {join} = require('path');

function getSetup(client, sftpUrl, localUrl) {
  return client
    .put(Buffer.from('hello'), join(sftpUrl, 'mocha-file.md'), {
      encoding: 'utf8'
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'large-file1.txt')
      );
    })
    .catch(err => {
      throw new Error(`Get setup hook error: ${err.message}`);
    });
}

function getCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'mocha-file.md'))
    .then(() => {
      return client.delete(join(sftpUrl, 'large-file1.txt'));
    })
    .catch(err => {
      throw new Error(`Get cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  getSetup,
  getCleanup
};
