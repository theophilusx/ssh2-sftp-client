'use strict';

const {join} = require('path');

function appendSetup(client, sftpUrl) {
  return client
    .put(
      Buffer.from('append test file'),
      join(sftpUrl, 'mocha-append-test1.md'),
      {
        encoding: 'utf8'
      }
    )
    .then(() => {
      return client.put(
        Buffer.from('append test file'),
        join(sftpUrl, 'mocha-append-test2.md'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return client.put(
        Buffer.from('append test file'),
        join(sftpUrl, 'mocha-append-test3.md'),
        {encoding: 'utf8'}
      );
    })
    .catch(err => {
      throw new Error(`Append setup hook error: ${err.message}`);
    });
}

function appendCleanup(client, sftpUrl) {
  return client
    .delete(join(sftpUrl, 'mocha-append-test1.md'))
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-append-test2.md'));
    })
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-append-test3.md'));
    })
    .catch(err => {
      throw new Error(`Append cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  appendSetup,
  appendCleanup
};
