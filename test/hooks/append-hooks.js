'use strict';

const {join} = require('path');

async function appendSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('append test file'),
      join(sftpUrl, 'mocha-append-test1.md')
    );
    await client.put(
      Buffer.from('append test file'),
      join(sftpUrl, 'mocha-append-test2.md')
    );
    await client.put(
      Buffer.from('append test file'),
      join(sftpUrl, 'mocha-append-test3.md'),
      {encoding: 'utf8'}
    );
    return true;
  } catch (err) {
    console.error(`appendSetup: ${err.message}`);
    return false;
  }
}

async function appendCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'mocha-append-test1.md'));
    await client.delete(join(sftpUrl, 'mocha-append-test2.md'));
    await client.delete(join(sftpUrl, 'mocha-append-test3.md'));
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
