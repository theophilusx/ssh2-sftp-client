'use strict';

const {join} = require('path');

function mkdirCleanup(client, sftpUrl) {
  return client
    .rmdir(join(sftpUrl, 'mocha'), true)
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`Mkdir test cleanup hook failure: ${err.message}`);
    });
}

module.exports = {
  mkdirCleanup
};
