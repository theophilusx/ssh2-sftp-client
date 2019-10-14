'use strict';

const {makeRemotePath} = require('./global-hooks');

async function appendSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('# Promise test file'),
      makeRemotePath(sftpUrl, 'append-promise-test.md')
    );
    await client.put(
      Buffer.from('# Append test 1 file'),
      makeRemotePath(sftpUrl, 'append-test1.md')
    );
    await client.put(
      Buffer.from('append test 2 file'),
      makeRemotePath(sftpUrl, 'append-test2.txt')
    );
    await client.put(
      Buffer.from('append test 3 file'),
      makeRemotePath(sftpUrl, 'append-test3'),
      {encoding: 'utf8'}
    );
    await client.mkdir(makeRemotePath(sftpUrl, 'append-dir-test'));
    return true;
  } catch (err) {
    console.error(`appendSetup: ${err.message}`);
    return false;
  }
}

async function appendCleanup(client, sftpUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'append-promise-test.md'));
    await client.delete(makeRemotePath(sftpUrl, 'append-test1.md'));
    await client.delete(makeRemotePath(sftpUrl, 'append-test2.txt'));
    await client.delete(makeRemotePath(sftpUrl, 'append-test3'));
    await client.rmdir(makeRemotePath(sftpUrl, 'append-dir-test'));
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
