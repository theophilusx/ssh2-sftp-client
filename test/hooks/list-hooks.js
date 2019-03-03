'use strict';

const {join} = require('path');

function listSetup(client, sftpUrl, localUrl) {
  return client
    .mkdir(join(sftpUrl, 'mocha-list/dir1'), true)
    .then(() => {
      return client.mkdir(join(sftpUrl, 'mocha-list/dir2/sub1'), true);
    })
    .then(() => {
      return client.mkdir(join(sftpUrl, 'mocha-list/empty'), true);
    })
    .then(() => {
      return client.put(
        Buffer.from('hello file1'),
        join(sftpUrl, 'mocha-list/file1.html'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return client.put(
        Buffer.from('hello file2'),
        join(sftpUrl, 'mocha-list/file2.md'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'mocha-list/test-file1.txt'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file2.txt.gz'),
        join(sftpUrl, 'mocha-list/test-file2.txt.gz')
      );
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`List method setup hook error: ${err.message}`);
    });
}

function listCleanup(client, sftpUrl) {
  return client
    .rmdir(join(sftpUrl, 'mocha-list'), true)
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`List method cleanup error: ${err.message}`);
    });
}

module.exports = {
  listSetup,
  listCleanup
};
