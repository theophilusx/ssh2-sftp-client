'use strict';

const dotenvPath = __dirname + '/../../.env';

require('dotenv').config({path: dotenvPath});

const Client = require('../../src/index.js');
const {join} = require('path');

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
    console.error(msg);
  };
} else if (process.env.DEBUG === 'client') {
  config.debug = (msg) => {
    if (msg.startsWith('CLIENT')) {
      console.error(msg);
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
    console.dir(config);
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
  config,
  makeLocalPath,
  makeRemotePath,
  splitRemotePath,
  lastRemoteDir,
  getConnection,
  closeConnection
};
