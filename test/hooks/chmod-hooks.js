import { removeRemoteIfExists } from './global-hooks.js';
async function chmodSetup(client, sftpUrl) {
  try {
    await chmodCleanup(client, sftpUrl);
    await client.put(Buffer.from('chmod testing'), `${sftpUrl}/chmod-test.txt`, {
      encoding: 'utf8',
    });
    await client.mkdir(`${sftpUrl}/chmod-test-dir`);
    return true;
  } catch (err) {
    console.error(`chmodSetup: ${err.message}`);
    return false;
  }
}

async function chmodCleanup(client, sftpUrl) {
  try {
    await removeRemoteIfExists(client, `${sftpUrl}/chmod-test.txt`);
    await removeRemoteIfExists(client, `${sftpUrl}/chmod-test-dir`);
    return true;
  } catch (err) {
    console.error(`chmodCleanup: ${err.message}`);
    return false;
  }
}

export {
  chmodSetup,
  chmodCleanup,
};
