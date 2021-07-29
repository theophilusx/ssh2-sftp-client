'use strict';

// This script uses the dotenv module. Remote SFTP server credentials are
// stored in a file called .env within the root of the repository. The dotenv module will
// read in the .env file and create environment variables for each entry which can then be
// queried with process.env in the script. The .env file is also in .gitignore.
// This combination provides some protection against committing files containing
// sensitive data (username/passwords etc). It also means I don't have to hard code credentials
// in the scripts themselves.
const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const Client = require('../src/index');
const { PassThrough } = require('stream');
const { createWriteStream } = require('fs');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const sftp = new Client();

// It is assumed this file already exists on the remote server
let remotePath = process.argv[2];

async function main() {
  try {
    await sftp.connect(config);
    console.log('connection established');
    const pt = new PassThrough();
    //const of = createWriteStream('./out.txt');
    const os = pt.pipe(process.stdout);
    await sftp.get(remotePath, os);
    console.log('File retrieved');
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await sftp.end();
    console.log('conneciton closed');
  }
}

main()
  .then(() => {
    console.log('All done!');
  })
  .catch((err) => {
    console.error('Error in main', err);
  });
