import dotenv from 'dotenv';

import { join } from 'node:path';
const dotenvPath = join(import.meta.dirname, '..', '.env');
dotenv.config({ path: dotenvPath });
import Client from '../src/index.js';

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
};

const client = new Client();

try {
  console.log(`Downloading files from ${remotePath}`);
  await client.connect(config);
  let listings = await client.list(remotePath);
  // BEWARE! array methods like forEach are NOT async/await safe!
  for (let item of listings) {
    let remoteFile = join(remotePath, item.name);
    let localFile = join(localPath, item.name);
    console.log(`Remote: ${remoteFile} Local: ${localFile}`);
    let res = await client.get(remoteFile, localFile);
    console.log(`${res} downloaded`);
  }
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
