import { makeLocalPath, removeRemoteIfExists } from './global-hooks.js';
import fs from 'node:fs';

async function streamSetup(client, sftpUrl, localUrl) {
  try {
    await streamCleanup(client, sftpUrl, localUrl);
    await client.fastPut(
      makeLocalPath(localUrl, 'test-file1.txt'),
      `${sftpUrl}/stream-read.txt`,
      { encoding: 'utf8' },
    );
  } catch (err) {
    throw new Error(`streamSetup: ${err.message}`);
  }
}

async function streamCleanup(client, sftpUrl, localUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/stream-read.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/stream-t3.txt`);
    fs.rmSync(`${localUrl}/stream-t1.txt`, { force: true });
    fs.rmSync(`${localUrl}/stream-t2.txt`, { force: true });
  } catch (err) {
    throw new Error(`streamCleanup: ${err.message}`);
  }
}

export {
  streamSetup,
  streamCleanup,
};
