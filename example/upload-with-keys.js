/*
 * Very simple upload script example which uses an ssh key for authentication
 *
 * This script uses the 'dotenv' library, which reads configuration data from
 * a simple key=value .env configuration file. The library then creates envrionment
 * variables for each key set to the corresponding value e.g.
 * SFTP_SERVER='my-sftp-host.com'
 * SFTP_PORT=22
 * SFTP_USER='fred'
 * SFTP_KEY_FILE='home/fred/.ssh/id_rsa'
 * SFTP_KEY_PASSPHRASE='my secret passphrase'
 *
 * This scirpt also accepts up to 4 command line arguments. These are
 * - path to the local file to upload
 * - path to the rmeote directory where the file should be uploaded to
 * - Name of the file created in the remote directory
 * - debug (optional) turn on basic console debugging
 *
 * The script will check to see if the remote directory exists. If it does, verifies it is
 * a directory (and not something else, like a file). If it does not exist, it will be created
 * The script then uploads the file using the put() method and then does a stat() on the remote
 * file to verify it now exists and reports the size. The script also checks to make sure the remote
 * file does not also exists - if it does, it throws and error and ends.
 *
 * Improvements: LOTS. This is a quick and dirty example. Error checking could be vastly improved
 * and there is unnecessary code duplication.
 */

const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const fs = require('fs');
const Client = require('../src/index');

const sftp = new Client();

async function main() {
  const config = {
    host: process.env.SFTP_SERVER,
    username: process.env.SFTP_USER,
    privateKey: fs.readFileSync(process.env.SFTP_KEY_FILE),
    passphrase: process.env.SFTP_KEY_PASSPHRASE,
    port: process.env.SFTP_PORT || 22,
  };

  let localFile = process.argv[2];
  let remoteDir = process.argv[3];
  let remoteFilename = process.argv[4];
  let debug = process.argv[5];

  if (debug) {
    config.debug = (msg) => {
      console.error(msg);
    };
  }

  try {
    await sftp.connect(config);
    let dirExists = await sftp.exists(remoteDir);
    if (dirExists && dirExists !== 'd') {
      throw new Error(
        `Bad path: ${remoteDir} exists, but is not a directory object`
      );
    }
    if (!dirExists) {
      await sftp.mkdir(remoteDir, true);
    }
    let remotePath = path.join(remoteDir, remoteFilename);
    let fileExists = await sftp.exists(remotePath);
    if (fileExists) {
      throw new Error(`Bad path: ${remotePath} already exists`);
    }
    await sftp.put(localFile, remotePath);
    let fileStat = await sftp.stat(remotePath);
    console.log(`Remote file ${remotePath} size is ${fileStat.size}`);
  } catch (err) {
    console.error(err.message);
  } finally {
    await sftp.end();
  }
}

main();
