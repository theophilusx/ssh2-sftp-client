'use strict';

const { makeLocalPath } = require('./global-hooks');
const fs = require('fs');

async function streamSetup(client, sftpUrl, localUrl) {
  try {
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      `${sftpUrl}/stream-read.txt`,
      { encoding: 'utf8' }
    );
  } catch (err) {
    throw new Error(`streamSetup: ${err.message}`);
  }
}

async function streamCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(`${sftpUrl}/stream-read.txt`);
    await client.delete(`${sftpUrl}/stream-t3.txt`);
    fs.unlinkSync(`${localUrl}/stream-t1.txt`);
    fs.unlinkSync(`${localUrl}/stream-t2.txt`);
  } catch (err) {
    throw new Error(`streamCleanup: ${err.message}`);
  }
}

module.exports = {
  streamSetup,
  streamCleanup,
};
