'use strict';

const {makeRemotePath} = require('./global-hooks');

async function deleteSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('hello'),
      makeRemotePath(sftpUrl, 'delete-file.md'),
      {
        encoding: 'utf8'
      }
    );
    await client.put(
      Buffer.from('promise'),
      makeRemotePath(sftpUrl, 'delete-promise.md'),
      {encoding: 'utf8'}
    );
    await client.put(
      Buffer.from('delete relative 1'),
      makeRemotePath(sftpUrl, 'delete-relative1.txt')
    );
    await client.put(
      Buffer.from('delete relative 2'),
      makeRemotePath(sftpUrl, 'delete-relative2.txt')
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
