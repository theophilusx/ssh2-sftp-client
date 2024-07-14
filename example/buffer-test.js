'use strict';

const dotenvPath = new URL('../.env', import.meta.url);
import dotenv from 'dotenv';
dotenv.config({ path: dotenvPath });

import { join } from 'node:path';
import sftp from '../src/index.js';

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
  }
};

const main = async () => {
  let client;

  try {
    let size = parseInt(process.argv[2]);
    let remotePath = process.argv[3];
    let config = {
      host: process.env.SFTP_SERVER,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASSWORD,
      port: process.env.SFTP_PORT || 22,
    };
    client = await getConnection(config);
    let listing1 = await client.list(remotePath);
    console.log(`Initial listing for ${remotePath}`);
    console.dir(listing1);
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
