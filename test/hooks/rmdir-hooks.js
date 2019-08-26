'use strict';

const {join} = require('path');

async function rmdirSetup(client, sftpUrl) {
  try {
    await client.mkdir(join(sftpUrl, 'mocha'));
    await client.mkdir(join(sftpUrl, 'mocha-rmdir/dir1'), true);
    await client.mkdir(join(sftpUrl, 'mocha-rmdir/dir2'), true);
    await client.mkdir(join(sftpUrl, 'mocha-rmdir/dir3/subdir'), true);
    await client.put(
      Buffer.from('hello'),
      join(sftpUrl, 'mocha-rmdir/file1.md'),
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
