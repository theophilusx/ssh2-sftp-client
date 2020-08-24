'use strict';

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

const sftp = new Client();

let remotePath = process.argv[2];
let re = new RegExp(process.argv[3]);

async function main() {
  await sftp.connect(config);
  let fileList = await sftp.list(remotePath, re);
  console.log(fileList);
  await sftp.end();
}

main().catch((e) => {
  console.error(e.message);
});
