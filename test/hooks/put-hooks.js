'use strict';

const {join} = require('path');

async function putCleanup(client, sftpUrl) {
  try {
    await client.delete(join(sftpUrl, 'mocha-put-string.md'));
    await client.delete(join(sftpUrl, 'mocha-put-buffer.md'));
    await client.delete(join(sftpUrl, 'mocha-put-stream.md'));
    return true;
  } catch (err) {
    console.error(`putCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  putCleanup
};
