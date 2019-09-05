'use strict';

const {join} = require('path');
//const fs = require('fs');

async function permissionSetup(client, sftpUrl, localUrl) {
  try {
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'no-access-get.txt')
    );
    await client.chmod(join(sftpUrl, 'no-access-get.txt'), 0o100);
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
