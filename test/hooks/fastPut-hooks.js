'use strict';

const {join} = require('path');

async function fastPutSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('fast put'),
      join(sftpUrl, 'mocha-fastput.md')
    );
    return true;
  } catch (err) {
    console.error(`fastPutSetup: ${err.message}`);
    return false;
  }
}

async function fastPutCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'remote.md'));
    await client.delete(join(sftpUrl, 'remote2.md.gz'));
    await client.delete(join(sftpUrl, 'mocha-fastput.md'));
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  fastPutSetup,
  fastPutCleanup
};
