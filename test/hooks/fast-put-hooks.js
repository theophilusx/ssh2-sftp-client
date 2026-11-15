import { removeRemoteIfExists } from './global-hooks.js';
import { mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';

function fastPutSetup(localUrl) {
  mkdirSync(join(localUrl, 'fp-dir'), { recursive: true });
  return true;
}

async function fastPutCleanup(client, sftpUrl, localUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-promise-test.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-text.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-text.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-relative1-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-relative2-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-relative3-gzip.txt.gz`);
    await removeRemoteIfExists(client, `${sftpUrl}/fastput-relative4-gzip.txt.gz`);
    rmdirSync(join(localUrl, 'fp-dir'));
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}

export {
  fastPutSetup,
  fastPutCleanup,
};
