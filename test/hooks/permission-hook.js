import { makeLocalPath, removeRemoteIfExists } from './global-hooks.js';
import { chmodSync } from 'node:fs';

async function permissionSetup(client, sftpUrl, localUrl) {
  try {
    await permissionCleanup(client, sftpUrl, localUrl);
    chmodSync(makeLocalPath(localUrl, 'no-access.txt'), 0o000);
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      `${sftpUrl}/no-access-get.txt`,
    );
    await client.chmod(`${sftpUrl}/no-access-get.txt`, '0o000');
    await client.mkdir(`${sftpUrl}/no-access-dir/sub-dir`, true);
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      `${sftpUrl}/no-access-dir/sub-dir/permission-gzip.txt.gz`,
    );
    await client.chmod(`${sftpUrl}/no-access-dir`, '0o000');
    return true;
  } catch (err) {
    console.error(`permissionSetup: ${err.message}`);
    return false;
  }
}

async function permissionCleanup(client, sftpUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/no-access-get.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/no-access-dir`);
    return true;
  } catch (err) {
    console.error(`permissionCleanup: ${err.message}`);
    return false;
  }
}

export {
  permissionSetup,
  permissionCleanup,
};
