import SftpClient = require('ssh2-sftp-client');

const client = new SftpClient('cjs');
void client.cwd();
