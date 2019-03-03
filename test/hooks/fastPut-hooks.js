'use strict';

const {join} = require('path');

function fastPutSetup(client, sftpUrl) {
  return client
    .put(Buffer.from('fast put'), join(sftpUrl, 'mocha-fastput.md'))
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`FastPut setup hook error: ${err.message}`);
    });
}

function fastPutCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'remote2.md.gz'))
    .then(() => {
      return client.delete(join(sftpUrl, 'remote.md'));
    })
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-fastput.md'));
    })
    .catch(err => {
      throw new Error(`FastPut cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  fastPutSetup,
  fastPutCleanup
};
