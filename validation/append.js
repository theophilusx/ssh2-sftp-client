'use strict';

const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.File({ filename: 'debug.log', level: 'debug' }),
  ],
});

const dotenvPath = path.join(__dirname, '..', '.env');

require('dotenv').config({ path: dotenvPath });

const { Client } = require('ssh2');

const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
  debug: (msg) => {
    logger.debug(msg);
  },
};

const remotePath = process.argv[2];

const client = new Client();

client
  .on('error', (err) => {
    console.error(`Client Error: ${err.message}`);
    config.debug('Client error event fired');
  })
  .on('end', () => {
    console.error('end event fired');
    config.debug('Client end event fired');
  })
  .on('close', () => {
    console.error('close event fired');
    config.debug('Client close event fired');
  })
  .on('ready', () => {
    client.sftp((err, sftp) => {
      if (err) {
        console.error(`SFTP Channel Error: ${err.message}`);
        config.debug(`SFTP channel error: ${err.message}`);
      } else {
        console.log('SFTP channel established');
        const buf = Buffer.from('some data to append');
        const stream = sftp.createWriteStream(remotePath, { flags: 'a' });
        stream
          .on('error', (err) => {
            console.error(`Stream Error: ${err.message}`);
            config.debug(`Stream error: ${err.message}`);
            client.end();
          })
          .on('finish', () => {
            console.log(`Data successfully appended to ${remotePath}`);
            client.end();
          });
        stream.end(buf);
      }
    });
  })
.connect(config);
