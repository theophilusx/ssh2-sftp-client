import SftpClient from '../../src/index.js';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({
      filename: fileURLToPath(new URL('../../debug.log', import.meta.url)),
      level: 'debug',
    }),
  ],
});

function hasListener(emitter, eventName, listenerName) {
  const listeners = emitter.listeners(eventName);
  const matches = listeners.filter((l) => l.name == listenerName);
  return matches.length === 0 ? false : true;
}

function dumpListeners(emitter) {
  const eventNames = emitter.eventNames();
  if (eventNames.length) {
    console.log('Listener Data');
    eventNames.map((n) => {
      const listeners = emitter.listeners(n);
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
  privateKey: process.env.SFTP_KEY_FILE ? readFileSync(process.env.SFTP_KEY_FILE) : null,
  passphrase: process.env.SFTP_KEY_PASSPHRASE,
  port: process.env.SFTP_PORT || 22,
  localUrl: process.env.LOCAL_URL,
  sftpUrl: process.env.SFTP_URL,
  delay: process.env.TEST_DELAY || 500,
  retries: 0,
  testServer: process.env.TEST_SERVER,
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

let con;

async function getConnection(configOverride = {}) {
  try {
    let baseConfig = { ...config, ...configOverride };
    delete baseConfig.privateKey;
    delete baseConfig.passphrase;
    if (!con) {
      con = new SftpClient();
      await con.connect(baseConfig);
      const root = await con.realPath('.');
      config.remoteRoot = root;
    } else {
      await con.connect(baseConfig);
    }
    return con;
  } catch (err) {
    console.error(`Connect failure ${err.message}`);
    throw err;
  }
}

async function getKeyConnection() {
  try {
    let baseConfig = { ...config };
    delete baseConfig.password;
    if (!con) {
      con = new SftpClient();
      await con.connect(baseConfig);
      const root = await con.realPath('.');
      config.remoteRoot = root;
    } else {
      await con.connect(baseConfig);
    }
    return con;
  } catch (err) {
    console.error(`Caonnect failure: ${err.message}`);
    throw err;
  }
}

/**
 * Throw unless remotePath is strictly inside the configured test root
 * (config.sftpUrl). Paths are normalised first, so `..` segments cannot
 * escape the root, and the root itself is refused.
 */
function assertInsideTestRoot(remotePath) {
  const root = posix.normalize(config.sftpUrl).replace(/\/+$/, '');
  const target = posix.normalize(remotePath).replace(/\/+$/, '');
  if (!root || root === '.' || !target.startsWith(`${root}/`)) {
    throw new Error(`refusing to remove ${remotePath}: outside the test root ${config.sftpUrl}`);
  }
}

/**
 * Remove a remote file or directory (recursively) if it exists, tolerating
 * leftover fixtures from an earlier failed run, including objects whose mode
 * was set to 000. Resolves true if something was removed, false if the path
 * did not exist. Only paths inside config.sftpUrl are accepted. A symlink is
 * unlinked without following it, so its target is left alone.
 */
async function removeRemoteIfExists(client, remotePath) {
  assertInsideTestRoot(remotePath);
  const type = await client.exists(remotePath);
  if (!type) {
    return false;
  }
  if (type === 'd') {
    await client.chmod(remotePath, 0o777).catch(() => {});
    await client.rmdir(remotePath, true);
  } else if (type === 'l') {
    await client.delete(remotePath, true);
  } else {
    await client.chmod(remotePath, 0o700).catch(() => {});
    await client.delete(remotePath, true);
  }
  return true;
}

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

export {
  hasListener,
  dumpListeners,
  config,
  makeLocalPath,
  makeRemotePath,
  splitRemotePath,
  lastRemoteDir,
  getConnection,
  getKeyConnection,
  closeConnection,
  removeRemoteIfExists,
  logger
};
