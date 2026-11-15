import { rmSync } from 'node:fs';
import { makeLocalPath, removeRemoteIfExists } from './global-hooks.js';

async function checksumCleanup(client, sftpUrl, localUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/checksum-file1.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/checksum-file2.txt.gz`);
    rmSync(makeLocalPath(localUrl, 'checksum-file1.txt'), { force: true });
    rmSync(makeLocalPath(localUrl, 'checksum-file2.txt.gz'), { force: true });
    return true;
  } catch (err) {
    console.error(`checksumCleanup: ${err.message}`);
    return false;
  }
}

export {
  checksumCleanup,
};
