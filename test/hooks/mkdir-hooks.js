'use strict';

const {join} = require('path');

async function mkdirCleanup(client, sftpUrl) {
  try {
    await client.rmdir(join(sftpUrl, 'mocha'), true);
    await client.rmdir('xyz', true);
    await client.rmdir('abc', true);
    await client.rmdir('def', true);
    return true;
  } catch (err) {
    console.error(`mkdirCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  mkdirCleanup
};
