'use strict';

const {join} = require('path');

function renameSetup(client, sftpUrl) {
  return client
    .put(Buffer.from('hello'), join(sftpUrl, 'mocha-rename.md'), {
      encoding: 'utf8'
    })
    .then(() => {
      return client.put(
        Buffer.from('conflict file'),
        join(sftpUrl, 'mocha-conflict.md'),
        {encoding: 'utf8'}
      );
    })
    .catch(err => {
      throw new Error(`Rename setup hook error: ${err.message}`);
    });
}

function renameCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'mocha-rename-new.md'))
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-conflict.md'));
    })
    .catch(err => {
      throw new Error(`Rename cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  renameSetup,
  renameCleanup
};
