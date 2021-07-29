'use strict';

const {makeLocalPath} = require('./global-hooks');
const fs = require('fs');

async function permissionSetup(client, sftpUrl, localUrl) {
  try {
    fs.chmodSync(makeLocalPath(localUrl, 'no-access.txt'), 0o000);
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      `${sftpUrl}/no-access-get.txt`
    );
    await client.chmod(`${sftpUrl}/no-access-get.txt`, '0o000');
    await client.mkdir(`${sftpUrl}/no-access-dir/sub-dir`, true);
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file2.txt.gz'),
      `${sftpUrl}/no-access-dir/sub-dir/permission-gzip.txt.gz`
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
    await client.chmod(`${sftpUrl}/no-access-get.txt`, 0o700);
    await client.delete(`${sftpUrl}/no-access-get.txt`);
    await client.chmod(`${sftpUrl}/no-access-dir`, 0o777);
    await client.rmdir(`${sftpUrl}/no-access-dir`, true);
    return true;
  } catch (err) {
    console.error(`permissionCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  permissionSetup,
  permissionCleanup
};
