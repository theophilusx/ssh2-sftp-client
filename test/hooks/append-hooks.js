'use strict';

async function appendSetup(client, sftpUrl) {
  try {
    await client.put(
      Buffer.from('# Promise test file'),
      `${sftpUrl}/append-promise-test.md`
    );
    await client.put(
      Buffer.from('# Append test 1 file'),
      `${sftpUrl}/append-test1.md`
    );
    await client.put(
      Buffer.from('append test 2 file'),
      `${sftpUrl}/append-test2.txt`
    );
    await client.put(
      Buffer.from('append test 3 file'),
      `${sftpUrl}/append-test3`,
      {encoding: 'utf8'}
    );
    await client.mkdir(`${sftpUrl}/append-dir-test`);
    return true;
  } catch (err) {
    console.error(`appendSetup: ${err.message}`);
    return false;
  }
}

async function appendCleanup(client, sftpUrl) {
  try {
    await client.delete(`${sftpUrl}/append-promise-test.md`);
    await client.delete(`${sftpUrl}/append-test1.md`);
    await client.delete(`${sftpUrl}/append-test2.txt`);
    await client.delete(`${sftpUrl}/append-test3`);
    await client.delete(`${sftpUrl}/append-new-file.txt`);
    await client.rmdir(`${sftpUrl}/append-dir-test`);
    return true;
  } catch (err) {
    console.error(`appendCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  appendSetup,
  appendCleanup
};
