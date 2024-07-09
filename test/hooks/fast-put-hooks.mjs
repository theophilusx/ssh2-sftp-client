import { mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';

export function fastPutSetup(localUrl) {
  mkdirSync(join(localUrl, 'fp-dir'));
  return true;
}

export async function fastPutCleanup(client, sftpUrl, localUrl) {
  try {
    await client.delete(`${sftpUrl}/fastput-promise-test.gz`, true);
    await client.delete(`${sftpUrl}/fastput-text.txt`, true);
    await client.delete(`${sftpUrl}/fastput-text.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative1-gzip.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative2-gzip.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative3-gzip.txt.gz`, true);
    await client.delete(`${sftpUrl}/fastput-relative4-gzip.txt.gz`, true);
    rmdirSync(join(localUrl, 'fp-dir'));
    return true;
  } catch (err) {
    console.error(`fastPutCleanup: ${err.message}`);
    return false;
  }
}
