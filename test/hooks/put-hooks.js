'use strict';

async function putCleanup(client, sftpUrl) {
  try {
    await client.delete(`${sftpUrl}/put-large.txt`);
    await client.delete(`${sftpUrl}/put-promise.txt`);
    await client.delete(`${sftpUrl}/put-buffer.txt`);
    await client.delete(`${sftpUrl}/put-stream.txt`);
    await client.delete(`${sftpUrl}/put-relative1-gzip.txt.gz`);
    await client.delete(`${sftpUrl}/put-relative2-gzip.txt.gz`);
    await client.delete(`${sftpUrl}/put-relative3-gzip.txt.gz`);
    await client.delete(`${sftpUrl}/put-relative4-gzip.txt.gz`);
    return true;
  } catch (err) {
    console.error(`putCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  putCleanup
};
