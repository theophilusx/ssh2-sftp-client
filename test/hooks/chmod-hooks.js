'use strict';

const {join} = require('path');

async function chmodSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('chmod testing'),
      join(sftpUrl, 'chmod-test.txt'),
      {
        encoding: 'utf8'
      }
    );
    await client.mkdir(join(sftpUrl, 'chmod-test-dir'));
    return true;
  } catch (err) {
    console.error(`chmodSetup: ${err.message}`);
    return false;
  }
}

async function chmodCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'chmod-test.txt'));
    await client.rmdir(join(sftpUrl, 'chmod-test-dir'));
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
