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

let maxConnections = 11;
let clientCount = 0;
let clients = [];
let promises = [];

function makeConnection() {
  clientCount++;
  let c = new Client(`Client-${clientCount}`);
  c.on('error', err => {
    console.log(`${c.clientName}: Error - ${err.message}`);
  });
  clients.push(c);
  promises.push(
    c
      .connect(config)
      .then(() => {
        console.log(`${c.clientName}: Connected`);
        return c.cwd();
      })
      .then(d => {
        console.log(`${c.clientName}: ${d}`);
        return c.end();
      })
      .then(() => {
        console.log(`${c.clientName}: Connection closed`);
        return true;
      })
  );
  console.log(`Connection ${clientCount} requested`);
}

while (clientCount < maxConnections) {
  makeConnection();
}

Promise.all(promises)
  .then(vals => {
    console.log('Script Completed');
    console.dir(vals);
  })
  .catch(err => {
    console.log(`First Error: ${err.message}`);
    console.log('Script terminated with errors');
  })
  .finally(async () => {
    for (let c of clients) {
      if (c.sftp) {
        await c.end();
      }
    }
  });
