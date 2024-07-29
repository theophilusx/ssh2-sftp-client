const { makeLocalPath } = require('./global-hooks.js');
const { mkdirSync, chmodSync, unlinkSync, rmdirSync } = require('node:fs');

async function getSetup(client, sftpUrl, localUrl) {
  try {
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
    await client.delete(sftpUrl + '/get-promise.txt');
    await client.delete(sftpUrl + '/get-large.txt');
    await client.delete(sftpUrl + '/get-gzip.txt.gz');
    unlinkSync(makeLocalPath(localUrl, 'get-large.txt'));
    unlinkSync(makeLocalPath(localUrl, 'get-gzip.txt.gz'));
    unlinkSync(makeLocalPath(localUrl, 'get-unzip.txt'));
    unlinkSync(makeLocalPath(localUrl, 'get-relative1-gzip.txt.gz'));
    unlinkSync(makeLocalPath(localUrl, 'get-relative2-gzip.txt.gz'));
    unlinkSync(makeLocalPath(localUrl, 'get-relative3-gzip.txt.gz'));
    unlinkSync(makeLocalPath(localUrl, 'get-relative4-gzip.txt.gz'));
    unlinkSync(makeLocalPath(localUrl, 'get-a-file.txt'));
    let noPermDir = makeLocalPath(localUrl, 'no-perm-dir');
    chmodSync(noPermDir, 0o666);
    rmdirSync(noPermDir);
    return true;
  } catch (err) {
    console.error(`getCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  getSetup,
  getCleanup,
};
