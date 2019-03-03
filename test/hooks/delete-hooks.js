'use strict';

const {join} = require('path');

function deleteSetup(client, sftpUrl) {
  return client
    .put(Buffer.from('hello'), join(sftpUrl, 'mocha-delete.md'), {
      encoding: 'utf8'
    })
    .then(() => {
      return client.put(
        Buffer.from('promise'),
        join(sftpUrl, 'mocha-delete-promise.md'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Delete setup hook error: ${err.message}`);
    });
}

module.exports = {
  deleteSetup
};
