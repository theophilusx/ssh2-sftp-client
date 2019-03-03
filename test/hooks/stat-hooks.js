'use strict';

const {join} = require('path');

function statSetup(client, sftpUrl) {
  return client
    .put(Buffer.from('hello'), join(sftpUrl, 'mocha-stat.md'), {
      encoding: 'utf8',
      mode: 0o777
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Stat test setup hook failure: ${err.message}`);
    });
}

function statCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'mocha-stat.md'))
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Stat test cleanup hook failed: ${err.message}`);
    });
}

module.exports = {
  statSetup,
  statCleanup
};
