const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const { argv, env, exit } = require('node:process');
const Client = require('../src/index');
const { createWriteStream } = require('node:fs');

const config = {
  host: env.SFTP_SERVER,
  username: env.SFTP_USER,
  password: env.SFTP_PASSWORD,
  port: env.SFTP_PORT || 22,
};

async function main() {
  let sftp = new Client();

  try {
    if (argv.length !== 4) {
      console.log('Wrong # arguments!\n');
      console.log('Usage: node ./stream-get.js <remote file> <local file>');
      exit(1);
    }
    const srcPath = argv[2];
    const dstPath = argv[3];
    await sftp.connect(config);
    const ws = createWriteStream(dstPath);
    ws.on('error', (err) => {
      console.error(`ws error: ${err.message}`);
    });
    ws.on('close', () => {
      console.log('ws close event raiswed');
    });
    ws.on('end', () => {
      console.log('ws end event raised');
    });
    await sftp.get(srcPath, ws);
    console.log('File downloaded');
  } catch (err) {
    console.error(`main: Error ${err.message}`);
  } finally {
    await sftp.end();
  }
}

main();
