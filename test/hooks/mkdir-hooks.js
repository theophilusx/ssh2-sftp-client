async function mkdirCleanup(client, sftpUrl) {
  try {
    await client.delete(`${sftpUrl}/bad-dir-file`);
    await client.chmod(`${sftpUrl}/bad-perm-dir`, 0o666);
    await client.rmdir(`${sftpUrl}/bad-perm-dir`, true);
    await client.rmdir(`${sftpUrl}/mkdir-non-recursive`, true);
    await client.rmdir(`${sftpUrl}/mkdir-promise`, true);
    await client.rmdir(`${sftpUrl}/mkdir-recursive`, true);
    await client.rmdir(`${sftpUrl}/mkdir-xyz`, true);
    await client.rmdir(`${sftpUrl}/mkdir-abc`, true);
    await client.rmdir(`${sftpUrl}/mkdir-def`, true);
    return true;
  } catch (err) {
    console.error(`mkdirCleanup: ${err.message}`);
    return false;
  }
}

module.exports = {
  mkdirCleanup,
};
