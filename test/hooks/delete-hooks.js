'use strict';

const {join} = require('path');

async function deleteSetup(client, sftpUrl) {
  try {
    await client.put(Buffer.from('hello'), join(sftpUrl, 'mocha-delete.md'), {
      encoding: 'utf8'
    });
    await client.put(
      Buffer.from('promise'),
      join(sftpUrl, 'mocha-delete-promise.md'),
      {encoding: 'utf8'}
    );
    return true;
  } catch (err) {
    console.error(`deleteSetup: ${err.message}`);
    return false;
  }
}

module.exports = {
  deleteSetup
};
