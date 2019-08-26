'use strict';

const {join} = require('path');

async function mkdirCleanup(client, sftpUrl) {
  try {
    await client.rmdir(join(sftpUrl, 'mocha'), true);
    return true;
  } catch (err) {
    console.error(`mkdirCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  mkdirCleanup
};
