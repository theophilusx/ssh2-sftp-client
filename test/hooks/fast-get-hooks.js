import { makeLocalPath, removeRemoteIfExists } from './global-hooks.js';
import { rmSync } from 'node:fs';

async function fastGetSetup(client, sftpUrl, localUrl) {
  try {
    await fastGetCleanup(client, sftpUrl, localUrl);
    await client.put(
      Buffer.from('fastGet promise test'),
      sftpUrl + '/fastget-promise.txt',
    );
    await client.put(Buffer.from('fast get small file'), sftpUrl + '/fastget-small.txt', {
      encoding: 'utf8',
    });
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      sftpUrl + '/fastget-large.txt',
      { encoding: 'utf8' },
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      sftpUrl + '/fastget-gzip.txt.gz',
    );
    await client.mkdir(`${sftpUrl}/fg-dir`);
    return true;
  } catch (err) {
    console.error(`fastGetSetup: ${err.message}`);
    return false;
  }
}

async function fastGetCleanup(client, sftpUrl, localUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/fg-dir`);
    await removeRemoteIfExists(client, sftpUrl + '/fastget-promise.txt');
    await removeRemoteIfExists(client, sftpUrl + '/fastget-small.txt');
    await removeRemoteIfExists(client, sftpUrl + '/fastget-large.txt');
    await removeRemoteIfExists(client, sftpUrl + '/fastget-gzip.txt.gz');
    rmSync(makeLocalPath(localUrl, 'fastget-promise.txt'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-small.txt'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-large.txt'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-relative1-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-relative2-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-relative3-gzip.txt.gz'), { force: true });
    rmSync(makeLocalPath(localUrl, 'fastget-relative4-gzip.txt.gz'), { force: true });
    return true;
  } catch (err) {
    console.error(`fastGetCleanup: ${err.message}`);
    return false;
  }
}

export {
  fastGetSetup,
  fastGetCleanup,
};
