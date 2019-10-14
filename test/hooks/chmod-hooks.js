'use strict';

const {makeRemotePath} = require('./global-hooks');

async function chmodSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('chmod testing'),
      makeRemotePath(sftpUrl, 'chmod-test.txt'),
      {
        encoding: 'utf8'
      }
    );
    await client.mkdir(makeRemotePath(sftpUrl, 'chmod-test-dir'));
    return true;
  } catch (err) {
    console.error(`chmodSetup: ${err.message}`);
    return false;
  }
}

async function chmodCleanup(client, sftpUrl) {
  try {
    await client.delete(makeRemotePath(sftpUrl, 'chmod-test.txt'));
    await client.rmdir(makeRemotePath(sftpUrl, 'chmod-test-dir'));
    return true;
  } catch (err) {
    console.error(`chmodCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  chmodSetup,
  chmodCleanup
};
