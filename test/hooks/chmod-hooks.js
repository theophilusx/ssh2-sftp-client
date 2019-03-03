'use strict';

const {join} = require('path');

function chmodSetup(client, sftpUrl) {
  return client
    .put(Buffer.from('hello'), join(sftpUrl, 'mocha-chmod.txt'), {
      encoding: 'utf8'
    })
    .catch(err => {
      throw new Error(`Chmod setup hook error: ${err.message}`);
    });
}

function chmodCleanup(client, sftpUrl) {
  return client.delete(join(sftpUrl, 'mocha-chmod.txt')).catch(err => {
    throw new Error(`Chmod cleanup hook error: ${err.message}`);
  });
}

module.exports = {
  chmodSetup,
  chmodCleanup
};
