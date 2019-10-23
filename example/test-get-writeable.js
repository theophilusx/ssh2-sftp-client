'use strict';

// This is a very simple script that will download the files
// specified on the command line and save it into a local file
// in the tmp directory called /tmp/download-test. This script demonstrates
// using a WriteStream object with the get() method. In most cases, if all
// you want to do is download a file, you are far better off just using the
// fastGet() method (where you supply just source and destination paths as
// strings and don't need to worry about creating writeStream objects). The
// fastGet() method tends to be faster as it allows for concurrent processes
// when downloading large files.

// Call the script as
// node ./test-git-writeable.js /path/to/remote/file

// use the following line and comment out the one below it if you are
// running using the ssh2-sftp-client from npmjs.com i.e. is in your package.json
//const Client = require('ssh2-sftp-client');
const Client = require('../src/index');
const fs = require('fs');

const config = {
  host: 'put host name here',
  port: 22,
  username:
    'put connect username here',
  password:
    'put connect password here',
  localFile: '/tmp/download-test'
};

async function doTransfer(target) {
  const client = new Client(
    'test-client'
  );

  try {
    await client.connect(config);
    let out = fs.createWriteStream(
      config.localFile,
      {
        flags: 'w',
        encoding: null
      }
    );
    let rStats = await client.stat(
      target
    );
    await client.get(target, out);
    let lStats = fs.statSync(
      config.localFile
    );
    console.log(
      `Remote File Size: ${rStats.size} Local File Size: ${lStats.size}`
    );
  } finally {
    client.end();
  }
}

let remoteFile = process.argv[2];

console.log(
  `Attempting to retrieve ${remoteFile}`
);

console.log(
  `Saving download as ${config.localFile}`
);

doTransfer(remoteFile)
  .then(() => {
    console.log(
      'Script complete successfully'
    );
  })
  .catch(err => {
    console.log(
      'Script terminated with errors'
    );
    console.log(err.message);
  });
