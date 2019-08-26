'use strict';

const {join} = require('path');
const fs = require('fs');

async function fastGetSetup(client, sftpUrl, localUrl) {
  try {
    await client.put(
      Buffer.from('fast get'),
      join(sftpUrl, 'mocha-fastget1.md'),
      {
        encoding: 'utf8'
      }
    );
    await client.fastPut(
      join(localUrl, 'test-file1.txt'),
      join(sftpUrl, 'mocha-fastget2.txt'),
      {encoding: 'utf8'}
    );
    await client.fastPut(
      join(localUrl, 'test-file2.txt.gz'),
      join(sftpUrl, 'mocha-fastget3.txt.gz'),
      {encoding: null}
    );
    fs.mkdirSync(join(localUrl, 'fastGet'));
    return true;
  } catch (err) {
    console.error(`fastGetSetup: ${err.message}`);
    return false;
  }
}

async function fastGetCleanup(client, sftpUrl, localUrl) {
  try {
    let localDir = join(localUrl, 'fastGet');
    await client.delete(join(sftpUrl, 'mocha-fastget1.md'));
    await client.delete(join(sftpUrl, 'mocha-fastget2.txt'));
    fs.unlinkSync(join(localDir, 'local1.md'));
    fs.unlinkSync(join(localDir, 'local2.txt'));
    fs.unlinkSync(join(localDir, 'local3.txt.gz'));
    await client.delete(join(sftpUrl, 'mocha-fastget3.txt.gz'));
    fs.rmdirSync(localDir);
    return true;
  } catch (err) {
    console.error(`fastGetCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastGetSetup,
  fastGetCleanup
};
