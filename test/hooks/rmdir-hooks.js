'use strict';

const {makeRemotePath} = require('./global-hooks');

async function rmdirSetup(client, sftpUrl) {
  try {
    await client.mkdir(makeRemotePath(sftpUrl, 'rmdir-promise'));
    await client.mkdir(makeRemotePath(sftpUrl, 'rmdir-non-empty/dir1'), true);
    await client.mkdir(makeRemotePath(sftpUrl, 'rmdir-non-empty/dir2'), true);
    await client.mkdir(
      makeRemotePath(sftpUrl, 'rmdir-non-empty/dir3/subdir'),
      true
    );
    await client.mkdir(makeRemotePath(sftpUrl, 'rmdir-empty'));
    await client.mkdir(makeRemotePath(sftpUrl, 'rmdir-relative1'));
    await client.mkdir(makeRemotePath(sftpUrl, 'rmdir-relative2'));
    await client.put(
      Buffer.from('hello'),
      makeRemotePath(sftpUrl, 'rmdir-non-empty/file1.md'),
      {encoding: 'utf8'}
    );
    return true;
  } catch (err) {
    console.error(`rmdirSetup: ${err.message}`);
    return false;
  }
}

module.exports = {
  rmdirSetup
};
