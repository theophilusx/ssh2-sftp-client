'use strict';

const {join} = require('path');

async function renameSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('Promise test file'),
      join(sftpUrl, 'rename-promise.md'),
      {
        encoding: 'utf8'
      }
    );
    await client.put(
      Buffer.from('conflict file'),
      join(sftpUrl, 'rename-conflict.md'),
      {encoding: 'utf8'}
    );
    return true;
  } catch (err) {
    console.error(`renameSetup: ${err.message}`);
    return false;
  }
}

async function renameCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'rename-relative4.md'));
    await client.delete(join(sftpUrl, 'rename-conflict.md'));
    return true;
  } catch (err) {
    console.error(`renameCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  renameSetup,
  renameCleanup
};
