'use strict';

const {makeRemotePath} = require('./global-hooks');

async function mkdirCleanup(client, sftpUrl) {
  try {
    await client.rmdir(makeRemotePath(sftpUrl, 'mkdir-non-recursive'), true);
    await client.rmdir(makeRemotePath(sftpUrl, 'mkdir-promise'), true);
    await client.rmdir(makeRemotePath(sftpUrl, 'mkdir-recursive'), true);
    await client.rmdir(makeRemotePath(sftpUrl, 'mkdir-xyz'), true);
    await client.rmdir(makeRemotePath(sftpUrl, 'mkdir-abc'), true);
    await client.rmdir(makeRemotePath(sftpUrl, 'mkdir-def'), true);
    return true;
  } catch (err) {
    console.error(`mkdirCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  mkdirCleanup
};
