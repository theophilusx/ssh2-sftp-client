import { makeLocalPath, removeRemoteIfExists } from './global-hooks.js';
import { mkdirSync, chmodSync, rmSync, rmdirSync } from 'node:fs';

async function getSetup(client, sftpUrl, localUrl) {
  try {
    await getCleanup(client, sftpUrl, localUrl);
    await client.put(Buffer.from('Get promise test'), sftpUrl + '/get-promise.txt', {
      encoding: 'utf8',
    });
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      sftpUrl + '/get-large.txt',
      { encoding: 'utf8' },
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      sftpUrl + '/get-gzip.txt.gz',
    );
    let noPermDir = makeLocalPath(localUrl, 'no-perm-dir');
    try {
      chmodSync(noPermDir, 0o777);
    } catch {
      // no stale directory from an earlier run
    }
    rmSync(noPermDir, { recursive: true, force: true });
    mkdirSync(noPermDir);
    chmodSync(noPermDir, 0o111);
    return true;
  } catch (err) {
    console.error(`getSetup: ${err.message}`);
    return false;
  }
}

async function getCleanup(client, sftpUrl, localUrl) {
  try {
    await removeRemoteIfExists(client, sftpUrl + '/get-promise.txt');
    await removeRemoteIfExists(client, sftpUrl + '/get-large.txt');
    await removeRemoteIfExists(client, sftpUrl + '/get-gzip.txt.gz');
    rmSync(makeLocalPath(localUrl, 'get-large.txt'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-unzip.txt'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-relative1-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-relative2-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-relative3-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-relative4-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'get-a-file.txt'), { force: true });
    let noPermDir = makeLocalPath(localUrl, 'no-perm-dir');
    chmodSync(noPermDir, 0o666);
    rmdirSync(noPermDir);
    return true;
  } catch (err) {
    console.error(`getCleanup: ${err.message}`);
    return false;
  }
}

export {
  getSetup,
  getCleanup,
};
