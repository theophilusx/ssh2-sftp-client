const { argv, env, exit } = require('node:process');
const Client = require('../src/index');

const config = {
  host: env.SFTP_SERVER,
  username: env.SFTP_USER,
  password: env.SFTP_PASSWORD,
  port: env.SFTP_PORT || 22,
};

if (argv.length < 3) {
  console.log('Wrong # args');
  console.log('Usage: node ./buffer-put.js <remote path> [debug]');
  console.log(
    '\nwhere:\n\tremote path = file path for upload\n\tdebug = turn on debugging',
  );
  exit(1);
}

const sftp = new Client();

let remotePath = argv[2];
let debug = argv[3];

if (debug) {
  config.debug = (msg) => {
    console.log(msg);
  };
}

async function load() {
  const str1 = 'abc';
  const str2 = '\ndef\n';

  const buffer1 = Buffer.from(str1, 'utf8');
  const buffer2 = Buffer.from(str2, 'utf8');

  await sftp.append(buffer1, remotePath, { encoding: 'utf-8', flags: 'a' });
  await sftp.append(buffer2, remotePath, { encoding: 'utf-8', flags: 'a' });
}

async function run() {
  try {
    await sftp.connect(config);
    await load();
    await load();
    await load();
  } catch (e) {
    console.log(`run() Error: ${e.message}`);
  } finally {
    sftp.end();
  }

  await sftp.end();
}

run().then(() => {
  console.log('Finished');
});
