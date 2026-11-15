import { removeRemoteIfExists } from './global-hooks.js';
async function renameSetup(client, sftpUrl) {
  try {
    await renameCleanup(client, sftpUrl);
    await client.put(Buffer.from('Promise test file'), `${sftpUrl}/rename-promise.md`, {
      encoding: 'utf8',
    });
    await client.put(Buffer.from('conflict file'), `${sftpUrl}/rename-conflict.md`, {
      encoding: 'utf8',
    });
    return true;
  } catch (err) {
    console.error(`renameSetup: ${err.message}`);
    return false;
  }
}

async function renameCleanup(client, sftpUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/rename-relative4.md`);
    await removeRemoteIfExists(client, `${sftpUrl}/rename-conflict.md`);
    return true;
  } catch (err) {
    console.error(`renameCleanup: ${err.message}`);
    return false;
  }
}

export {
  renameSetup,
  renameCleanup,
};
