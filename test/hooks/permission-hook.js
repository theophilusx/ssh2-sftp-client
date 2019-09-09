'use strict';

const {join} = require('path');
const fs = require('fs');

async function permissionSetup(client, sftpUrl, localUrl) {
  try {
    fs.chmodSync(join(localUrl, 'no-access.txt'), 0o000);
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'no-access-get.txt')
    );
    await client.chmod(join(sftpUrl, 'no-access-get.txt'), '0o000');
    await client.mkdir(join(sftpUrl, 'no-access-dir', 'sub-dir'), true);
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'no-access-dir', 'sub-dir', 'permission-gzip.txt.gz')
    );
    await client.chmod(join(sftpUrl, 'no-access-dir'), '0o000');
    return true;
  } catch (err) {
    console.error(`permissionSetup: ${err.message}`);
    return false;
  }
}

async function permissionCleanup(client, sftpUrl) {
  try {
    await client.chmod(join(sftpUrl, 'no-access-get.txt'), 0o700);
    await client.delete(join(sftpUrl, 'no-access-get.txt'));
    await client.chmod(join(sftpUrl, 'no-access-dir'), 0o777);
    await client.rmdir(join(sftpUrl, 'no-access-dir'), true);
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
