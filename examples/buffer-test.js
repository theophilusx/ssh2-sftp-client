'use strict';

const { join } = require('node:path');
const dotenvPath = join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });
const sftp = require('../src/index');
const { argv, env, exit } = require('node:process');

const getConnection = async (config) => {
  let client;

  try {
    console.log('Opening sftp connection');
    client = new sftp();
    await client.connect(config);
    console.log('connection established');
    return client;
  } catch (err) {
    console.error(err.message);
    exit(1);
  }
};

const putBuffer = async (client, size, remotePath) => {
  let rslt;

  try {
    let bufSize = 1024 * size;
    let remoteFile = join(remotePath, `${bufSize}data.txt`);
    console.log(`Uploading buffer of ${bufSize} bytes to ${remoteFile}`);
    rslt = await client.put(Buffer.alloc(bufSize), remoteFile);
    console.log(`buffer of size ${bufSize} uploaded`);
    return rslt;
  } catch (err) {
    console.error(err.message);
    exit(1);
  }
};

const main = async () => {
  let client;

  try {
    if (argv.length < 4) {
      console.log('Wrong # args');
      console.log('Usage: node ./buffer-test.js <size> <remote path>');
      console.log('\nwhere:\n\tsize = data size\n\tremote path = remote directory path');
      exit(1);
    }
    let size = parseInt(argv[2]);
    let remotePath = argv[3];
    let config = {
      host: env.SFTP_SERVER,
      username: env.SFTP_USER,
      password: env.SFTP_PASSWORD,
      port: env.SFTP_PORT || 22,
    };
    client = await getConnection(config);
    console.log(`Check remote dir ${remotePath}`);
    if (await client.exists(remotePath)) {
      let listing1 = await client.list(remotePath);
      console.log(`Initial listing for ${remotePath}`);
      console.dir(listing1);
    } else {
      console.log('remote dir does not yet exists, will create');
      await client.mkdir(remotePath);
    }
    let result = await putBuffer(client, size, remotePath);
    console.log(`Result: ${result}`);
    let listing2 = await client.list(remotePath);
    console.log(`Final listing for ${remotePath}`);
    console.dir(listing2);
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
};

main();
