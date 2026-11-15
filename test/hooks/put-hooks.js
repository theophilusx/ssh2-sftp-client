import { removeRemoteIfExists } from './global-hooks.js';
async function putCleanup(client, sftpUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/put-large.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-promise.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-buffer.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-stream.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-relative1-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-relative2-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-relative3-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-relative4-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/put-gzip-test.gz`);
    return true;
  } catch (err) {
    console.error(`putCleanup: ${err.message}`);
    return false;
  }
}

export {
  putCleanup,
};
