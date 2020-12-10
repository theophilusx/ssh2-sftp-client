'use strict';

async function renameSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('Promise test file'),
      `${sftpUrl}/rename-promise.md`,
      {
        encoding: 'utf8'
      }
    );
    await client.put(
      Buffer.from('conflict file'),
      `${sftpUrl}/rename-conflict.md`,
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
    await client.delete(`${sftpUrl}/rename-relative4.md`, true);
    await client.delete(`${sftpUrl}/rename-conflict.md`, true);
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
