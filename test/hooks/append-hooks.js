import { removeRemoteIfExists } from './global-hooks.js';
async function appendSetup(client, sftpUrl) {
  try {
    await appendCleanup(client, sftpUrl);
    await client.put(
      Buffer.from('# Promise test file'),
      `${sftpUrl}/append-promise-test.md`,
    );
    await client.put(Buffer.from('# Append test 1 file'), `${sftpUrl}/append-test1.md`);
    await client.put(Buffer.from('append test 2 file'), `${sftpUrl}/append-test2.txt`);
    await client.put(Buffer.from('append test 3 file'), `${sftpUrl}/append-test3`, {
      encoding: 'utf8',
    });
    await client.mkdir(`${sftpUrl}/append-dir-test`);
    return true;
  } catch (err) {
    console.error(`appendSetup: ${err.message}`);
    return false;
  }
}

async function appendCleanup(client, sftpUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/append-promise-test.md`);
    await removeRemoteIfExists(client, `${sftpUrl}/append-test1.md`);
    await removeRemoteIfExists(client, `${sftpUrl}/append-test2.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/append-test3`);
    await removeRemoteIfExists(client, `${sftpUrl}/append-new-file.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/append-dir-test`);
    return true;
  } catch (err) {
    console.error(`appendCleanup: ${err.message}`);
    return false;
  }
}

export {
  appendSetup,
  appendCleanup,
};
