'use strict';

async function rmdirSetup(client, sftpUrl) {
  try {
    await client.mkdir(`${sftpUrl}/rmdir-promise`);
    await client.mkdir(`${sftpUrl}/rmdir-non-empty/dir1`, true);
    await client.mkdir(`${sftpUrl}/rmdir-non-empty/dir2`, true);
    await client.mkdir(`${sftpUrl}/rmdir-non-empty/dir3/subdir`, true);
    await client.mkdir(`${sftpUrl}/rmdir-empty`);
    await client.mkdir(`${sftpUrl}/rmdir-relative1`);
    await client.mkdir(`${sftpUrl}/rmdir-relative2`);
    await client.put(
      Buffer.from('hello'),
      `${sftpUrl}/rmdir-non-empty/file1.md`,
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
