'use strict';

const dotenvPath = __dirname + '/../../.env';

require('dotenv').config({path: dotenvPath});

const Client = require('../../src/index.js');
const {join} = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.File({filename: 'debug.log', level: 'debug'})
  ]
});

function hasListener(emitter, eventName, listenerName) {
  let listeners = emitter.listeners(eventName);
  let matches = listeners.filter((l) => l.name == listenerName);
  return matches.length === 0 ? false : true;
}

function dumpListeners(emitter) {
  let eventNames = emitter.eventNames();
  if (eventNames.length) {
    console.log('Listener Data');
    eventNames.map((n) => {
      let listeners = emitter.listeners(n);
      console.log(`${n}: ${emitter.listenerCount(n)}`);
      console.dir(listeners);
      listeners.map((l) => {
        console.log(`listener name = ${l.name}`);
      });
    });
  }
}

// use your test ssh server config
const config = {
  host: process.env.SFTP_SERVER,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  port: process.env.SFTP_PORT || 22,
  localUrl: process.env.LOCAL_URL,
  sftpUrl: process.env.SFTP_URL,
  delay: process.env.TEST_DELAY || 500,
  retries: 1
};

if (process.env.DEBUG === 'true') {
  config.debug = (msg) => {
    logger.debug(msg);
  };
} else if (process.env.DEBUG === 'client') {
  config.debug = (msg) => {
    if (msg.startsWith('CLIENT')) {
      logger.debug(msg);
    }
  };
}

const makeLocalPath = (...args) => {
  return join(...args);
};

const makeRemotePath = (...args) => {
  let newPath = '';
  if (process.env.TEST_SERVER === 'unix') {
    newPath = args.join('/');
    return newPath.replace(/\/\//gi, '/');
  }
  return args.join('\\');
};

const splitRemotePath = (p) => {
  return p.split('/');
};

const lastRemoteDir = (p) => {
  let dirs = splitRemotePath(p);
  return dirs[dirs.length - 1];
};

var con = undefined;

const getConnection = async () => {
  try {
    if (!con) {
      con = new Client();
      await con.connect(config);
      let root = await con.realPath('.');
      config.remoteRoot = root;
    } else {
      await con.connect(config);
    }
    return con;
  } catch (err) {
    console.error(`Connect failure ${err.message}`);
    let eventNames = con.client.eventNames();
    if (eventNames.length) {
      console.log('Listener Data');
      eventNames.map((n) => {
        let listeners = con.client.listeners(n);
        console.log(`${n}: ${con.client.listenerCount(n)}`);
        console.dir(listeners);
        listeners.map((l) => {
          console.log(`listener name = ${l.name}`);
        });
      });
    }

    throw err;
  }
};

const closeConnection = async () => {
  try {
    if (con) {
      await con.end();
      con = undefined;
    }
    return true;
  } catch (err) {
    console.error(`Connection close failure: ${err.message}`);
    throw err;
  }
};

module.exports = {
  hasListener,
  dumpListeners,
  config,
  makeLocalPath,
  makeRemotePath,
  splitRemotePath,
  lastRemoteDir,
  getConnection,
  closeConnection
};
