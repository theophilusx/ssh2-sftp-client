'use strict';

const {join} = require('path');

async function mkdirCleanup(client, sftpUrl) {
  try {
    await client.rmdir(join(sftpUrl, 'mkdir-non-recursive'), true);
    await client.rmdir(join(sftpUrl, 'mkdir-promise'), true);
    await client.rmdir(join(sftpUrl, 'mkdir-recursive'), true);
    await client.rmdir(join(sftpUrl, 'mkdir-xyz'), true);
    await client.rmdir(join(sftpUrl, 'mkdir-abc'), true);
    await client.rmdir(join(sftpUrl, 'mkdir-def'), true);
    return true;
  } catch (err) {
    console.error(`mkdirCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  mkdirCleanup
};
