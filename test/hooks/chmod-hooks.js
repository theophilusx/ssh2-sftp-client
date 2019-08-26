'use strict';

const {join} = require('path');

async function chmodSetup(client, sftpUrl) {
  try {
    await client.put(Buffer.from('hello'), join(sftpUrl, 'mocha-chmod.txt'), {
      encoding: 'utf8'
    });
    return true;
  } catch (err) {
    console.error(`chmodSetup: ${err.message}`);
    return false;
  }
}

async function chmodCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'mocha-chmod.txt'));
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
