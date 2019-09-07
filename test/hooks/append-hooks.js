'use strict';

const {join} = require('path');

async function appendSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('# Promise test file'),
      join(sftpUrl, 'append-promise-test.md')
    );
    await client.put(
      Buffer.from('# Append test 1 file'),
      join(sftpUrl, 'append-test1.md')
    );
    await client.put(
      Buffer.from('append test 2 file'),
      join(sftpUrl, 'append-test2.txt')
    );
    await client.put(
      Buffer.from('append test 3 file'),
      join(sftpUrl, 'append-test3'),
      {encoding: 'utf8'}
    );
    await client.mkdir(join(sftpUrl, 'append-dir-test'));
    return true;
  } catch (err) {
    console.error(`appendSetup: ${err.message}`);
    return false;
  }
}

async function appendCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'append-promise-test.md'));
    await client.delete(join(sftpUrl, 'append-test1.md'));
    await client.delete(join(sftpUrl, 'append-test2.txt'));
    await client.delete(join(sftpUrl, 'append-test3'));
    await client.rmdir(join(sftpUrl, 'append-dir-test'));
    return true;
  } catch (err) {
    console.error(`appendCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  appendSetup,
  appendCleanup
};
