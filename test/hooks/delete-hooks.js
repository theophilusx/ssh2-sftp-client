'use strict';

async function deleteSetup(client, sftpUrl) {
  try {
    await client.put(Buffer.from('hello'), `${sftpUrl}/delete-file.md`, {
      encoding: 'utf8'
    });
    await client.put(Buffer.from('promise'), `${sftpUrl}/delete-promise.md`, {
      encoding: 'utf8'
    });
    await client.put(
      Buffer.from('delete relative 1'),
      `${sftpUrl}/delete-relative1.txt`
    );
    await client.put(
      Buffer.from('delete relative 2'),
      `${sftpUrl}/delete-relative2.txt`
    );
    return true;
  } catch (err) {
    console.error(`deleteSetup: ${err.message}`);
    return false;
  }
}

module.exports = {
  deleteSetup
};
