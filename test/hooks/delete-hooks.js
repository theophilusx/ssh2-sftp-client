'use strict';

const {join} = require('path');

async function deleteSetup(client, sftpUrl) {
  try {
    await client.put(Buffer.from('hello'), join(sftpUrl, 'delete-file.md'), {
      encoding: 'utf8'
    });
    await client.put(
      Buffer.from('promise'),
      join(sftpUrl, 'delete-promise.md'),
      {encoding: 'utf8'}
    );
    await client.put(
      Buffer.from('delete relative 1'),
      join(sftpUrl, 'delete-relative1.txt')
    );
    await client.put(
      Buffer.from('delete relative 2'),
      join(sftpUrl, 'delete-relative2.txt')
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
