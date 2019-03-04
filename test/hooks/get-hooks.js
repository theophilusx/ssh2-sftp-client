'use strict';

const {join} = require('path');
const fs = require('fs');

function getSetup(client, sftpUrl, localUrl) {
  return client
    .put(Buffer.from('hello'), join(sftpUrl, 'mocha-file.md'), {
      encoding: 'utf8'
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'large-file1.txt'),
        {encoding: 'utf8'}
      );
    })
    .then(() => {
      return client.fastPut(
        join(localUrl, 'test-file2.txt.gz'),
        join(sftpUrl, 'gzipped-file.txt.gz')
      );
    })
    .catch(err => {
      throw new Error(`Get setup hook error: ${err.message}`);
    });
}

function getCleanup(client, sftpUrl, localUrl) {
  return client
    .delete(join(sftpUrl, 'mocha-file.md'))
    .then(() => {
      return client.delete(join(sftpUrl, 'large-file1.txt'));
    })
    .then(() => {
      return client.delete(join(sftpUrl, 'gzipped-file.txt.gz'));
    })
    .then(() => {
      fs.unlinkSync(join(localUrl, 'local-large-file.txt'));
      fs.unlinkSync(join(localUrl, 'local-gizipped-file.txt.gz'));
      fs.unlinkSync(join(localUrl, 'local-gzipped-file.txt'));
      return true;
    })
    .catch(err => {
      throw new Error(`Get cleanup hook error: ${err.message}`);
    });
}

module.exports = {
  getSetup,
  getCleanup
};
