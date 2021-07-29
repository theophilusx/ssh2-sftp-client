'use strict';

const {join} = require('path');

function putCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'mocha-put-string.md'))
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-put-buffer.md'));
    })
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-put-stream.md'));
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Put cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  putCleanup
};
