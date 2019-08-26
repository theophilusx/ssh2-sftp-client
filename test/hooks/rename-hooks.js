'use strict';

const {join} = require('path');

async function renameSetup(client, sftpUrl) {
  try {
    await client.put(Buffer.from('hello'), join(sftpUrl, 'mocha-rename.md'), {
      encoding: 'utf8'
    });
    await client.put(
      Buffer.from('conflict file'),
      join(sftpUrl, 'mocha-conflict.md'),
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
    await client.delete(join(sftpUrl, 'mocha-rename-new.md'));
    await client.delete(join(sftpUrl, 'mocha-conflict.md'));
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
