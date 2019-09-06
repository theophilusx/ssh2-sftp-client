'use strict';

const {join} = require('path');

async function statSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('# Stat test data'),
      join(sftpUrl, 'stat-test.md'),
      {
        encoding: 'utf8',
        mode: 0o777
      }
    );
    return true;
  } catch (err) {
    console.error(`statSetup: ${err.message}`);
    return false;
  }
}

async function statCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'stat-test.md'));
    return true;
  } catch (err) {
    console.error(`statCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  statSetup,
  statCleanup
};
