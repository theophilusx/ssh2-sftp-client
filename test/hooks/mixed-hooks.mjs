import { makeLocalPath, makeRemotePath } from './global-hooks.mjs';

export async function realpathSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(makeRemotePath(sftpUrl, 'path-test-dir'));
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      makeRemotePath(sftpUrl, 'path-test-dir', 'path-file1.txt'),
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      makeRemotePath(sftpUrl, 'path-test-dir', 'path-file2.txt.gz'),
    );
    return true;
  } catch (err) {
    throw new Error(`mixedSetup: ${err.message}`);
  }
}

export async function realpathCleanup(client, sftpUrl) {
  try {
    await client.rmdir(makeRemotePath(sftpUrl, 'path-test-dir'), true);
    return true;
  } catch (err) {
    throw new Error(`mixedClenaup: ${err.message}`);
  }
}

export async function listSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(`${sftpUrl}/list-test/dir1`, true);
    await client.mkdir(`${sftpUrl}/list-test/dir2/sub1`, true);
    await client.mkdir(`${sftpUrl}/list-test/empty`, true);
    await client.put(
      Buffer.from('<title>List Test Data 1</title>'),
      `${sftpUrl}/list-test/file1.html`,
      { encoding: 'utf8' },
    );
    await client.put(Buffer.from('# List Test Data 2'), `${sftpUrl}/list-test/file2.md`, {
      encoding: 'utf8',
    });
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      `${sftpUrl}/list-test/test-file1.txt`,
      { encoding: 'utf8' },
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      `${sftpUrl}/list-test/test-file2.txt.gz`,
    );
    return true;
  } catch (err) {
    throw new Error(`listSetup: ${err.message}`);
  }
}

export async function listCleanup(client, sftpUrl) {
  try {
    await client.rmdir(`${sftpUrl}/list-test`, true);
    return true;
  } catch (err) {
    throw new Error(`listCleanup: ${err.message}`);
  }
}

export async function existSetup(client, sftpUrl, localUrl) {
  try {
    await client.mkdir(`${sftpUrl}/exist-test-dir`);
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      `${sftpUrl}/exist-file.txt`,
    );
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      `${sftpUrl}/exist-test-dir/exist-gzip.txt.gz`,
    );
    return true;
  } catch (err) {
    throw new Error(`existSetup: ${err.message}`);
  }
}

export async function existCleanup(client, sftpUrl) {
  try {
    await client.delete(`${sftpUrl}/exist-file.txt`, true);
    await client.rmdir(`${sftpUrl}/exist-test-dir`, true);
    return true;
  } catch (err) {
    throw new Error(`existCleanup: ${err.message}`);
  }
}

export async function statSetup(client, sftpUrl) {
  try {
    await client.put(Buffer.from('# Stat test data'), `${sftpUrl}/stat-test.md`, {
      encoding: 'utf8',
      mode: 0o777,
    });
    return true;
  } catch (err) {
    throw new Error(`statSetup: ${err.message}`);
  }
}

export async function statCleanup(client, sftpUrl) {
  try {
    await client.delete(`${sftpUrl}/stat-test.md`, true);
    return true;
  } catch (err) {
    throw new Error(`statCleanup: ${err.message}`);
  }
}
