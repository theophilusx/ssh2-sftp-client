'use strict';

// sample use of exists() to test for remote dir/file existance

const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({path: dotenvPath});

const Client = require('../src/index');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22
};

const targetPath = process.argv[2];

async function main() {
  let client = new Client();

  try {
    await client.connect(config);
    let status = await client.exists(targetPath);
    if (status) {
      console.log(`${targetPath} exists. [${status}]`);
    } else {
      console.log(`${targetPath} does not exist`);
    }
    return true;
  } catch (err) {
    console.log(`Unexpected Error: ${err.message}`);
    return false;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.log(`Error: ${err.message}`);
});
