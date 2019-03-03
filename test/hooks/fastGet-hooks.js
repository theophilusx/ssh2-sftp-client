'use strict';

const {join} = require('path');
const fs = require('fs');

function fastGetSetup(client, sftpUrl, localUrl) {
  return client
    .put(Buffer.from('fast get'), join(sftpUrl, 'mocha-fastget1.md'), {
      encoding: 'utf8'
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'mocha-fastget2.txt'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file2.txt.gz'),
        join(sftpUrl, 'mocha-fastget3.txt.gz'),
        {encoding: null}
      );
    })
    .then(() => {
      return fs.mkdirSync(join(localUrl, 'fastGet'));
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`FastGet test setup error: ${err.message}`);
    });
}

function fastGetCleanup(client, sftpUrl, localUrl) {
  let localDir = join(localUrl, 'fastGet');
  return client
    .delete(join(sftpUrl, 'mocha-fastget1.md'))
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-fastget2.txt'));
    })
    .then(() => {
      return client.delete(join(sftpUrl, 'mocha-fastget3.txt.gz'));
    })
    .then(() => {
      fs.unlinkSync(join(localDir, 'local1.md'));
      fs.unlinkSync(join(localDir, 'local2.txt'));
      fs.unlinkSync(join(localDir, 'local3.txt.gz'));
      return fs.rmdirSync(localDir);
    })
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(`FastGet test cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  fastGetSetup,
  fastGetCleanup
};
