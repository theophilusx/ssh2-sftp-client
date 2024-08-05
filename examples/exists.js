'use strict';

// sample use of exists() to test for remote dir/file existance

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const Client = require('../src/index.js');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const targetPath = process.argv[2];

async function main() {
  let client = new Client();

  try {
    await client.connect(config);
    let status = await client.exists(targetPath);
    console.log(`${targetPath} ${status ? 'exists' : 'does not exist'}`);
    console.log(`${targetPath} ${status === 'd' ? 'is a directory' : 'is a file'}`);
    return status;
  } catch (err) {
    console.log(`Unexpected Error: ${err.message}`);
    return false;
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
}
