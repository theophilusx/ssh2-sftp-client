import { removeRemoteIfExists } from './global-hooks.js';
async function mkdirCleanup(client, sftpUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/bad-dir-file`);
    await removeRemoteIfExists(client, `${sftpUrl}/bad-perm-dir`);
    await removeRemoteIfExists(client, `${sftpUrl}/mkdir-non-recursive`);
    await removeRemoteIfExists(client, `${sftpUrl}/mkdir-promise`);
    await removeRemoteIfExists(client, `${sftpUrl}/mkdir-recursive`);
    await removeRemoteIfExists(client, `${sftpUrl}/mkdir-xyz`);
    await removeRemoteIfExists(client, `${sftpUrl}/mkdir-abc`);
    await removeRemoteIfExists(client, `${sftpUrl}/mkdir-def`);
    return true;
  } catch (err) {
    console.error(`mkdirCleanup: ${err.message}`);
    return false;
  }
}

export {
  mkdirCleanup,
};
