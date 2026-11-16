import { readFileSync } from 'node:fs';
import Client from '../src/index.js';

const keyFile = `${process.env.HOME}/.ssh/id_ed25519.pub`;

const config = {
  host: '127.0.0.1',
  port: '8080',
  username: 'test',
  passphrase: 'secvret key passphrase',
  privateKey: readFileSync(keyFile, { encoding: 'utf8' }),
};

const sftp = new Client();
try {
  await sftp.connect(config);
  // do whatever remembering it is async
} catch (err) {
  console.error(err);
} finally {
  await sftp.end();
}
