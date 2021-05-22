'use strict';

// This script uses the dotenv module. Remote SFTP server credentials are
// stored in a file called .env within the root of the repository. The dotenv module will
// read in the .env file and create environment variables for each entry which can then be
// queried with process.env in the script. The .env file is also in .gitignore.
// This combination provides some protection against committing files containing
// sensitive data (username/passwords etc). It also means I don't have to hard code credentials
// in the scripts themselves.
const path = require('path');
const { createGzip } = require('zlib');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const Client = require('../src/index');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const sftp = new Client();

// It is assumed the src file already exists on the remote server
const srcFilepath = process.argv[2];
const dstFilepath = process.argv[3];

async function main() {
  try {
    await sftp.connect(config);
    console.log('Connection established');
    const result = await sftp.copyFile(srcFilepath, dstFilepath, createGzip());
    console.log(result);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    throw err;
  } finally {
    await sftp.end();
    console.log('Connection closed');
  }
}

main()
  .then(() => {
    console.log('All done!');
  })
  .catch((err) => {
    console.error('Error in main', err);
  });
