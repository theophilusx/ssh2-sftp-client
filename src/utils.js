'use strict';

const fs = require('fs');
const path = require('path');
const constants = require('./constants');

/**
 * Generate a new Error object with a reformatted error message which
 * is a little more informative and useful to users.
 *
 * @param {Error|string} err - The Error object the new error will be based on
 * @param {number} retryCount - For those functions which use retry. Number of
 *                              attempts to complete before giving up
 * @returns {Error} New error with custom error message
 */
function formatError(
  err,
  name = 'sftp',
  eCode = constants.errorCode.generic,
  retryCount
) {
  let msg = '';
  let code = '';
  let retry = retryCount
    ? ` after ${retryCount} ${retryCount > 1 ? 'attempts' : 'attempt'}`
    : '';

  if (typeof err === 'string') {
    msg = `${name}: ${err}${retry}`;
    code = eCode;
  } else if (err.custom) {
    msg = `${name}: ${err.message}${retry}`;
    code = err.code;
  } else {
    switch (err.code) {
      case 'ENOTFOUND':
        msg =
          `${name}: ${err.level} error. ` +
          `Address lookup failed for host ${err.hostname}${retry}`;
        break;
      case 'ECONNREFUSED':
        msg =
          `${name}: ${err.level} error. Remote host at ` +
          `${err.address} refused connection${retry}`;
        break;
      case 'ECONNRESET':
        msg =
          `${name}: Remote host has reset the connection: ` +
          `${err.message}${retry}`;
        break;
      case 'ENOENT':
        msg = `${name}: ${err.message}${retry}`;
        break;
      default:
        msg = `${name}: ${err.message}${retry}`;
    }
    code = err.code ? err.code : eCode;
  }
  let newError = new Error(msg);
  newError.code = code;
  newError.custom = true;
  return newError;
}

function handleError(err, name, reject) {
  if (reject) {
    if (err.custom) {
      reject(err);
    } else {
      reject(formatError(err, name));
    }
  } else {
    if (err.custom) {
      throw err;
    } else {
      throw formatError(err, name);
    }
  }
}

/**
 * Remove all ready, error and end listeners.
 *
 * @param {Emitter} emitter - The emitter object to remove listeners from
 */
function removeListeners(emitter) {
  let listeners = emitter.eventNames();
  listeners.forEach(name => {
    emitter.removeAllListeners(name);
  });
}

/**
 * Simple default error listener. Will reformat the error message and
 * throw a new error.
 *
 * @param {Error} err - source for defining new error
 * @throws {Error} Throws new error
 */
function makeErrorListener(reject, self) {
  return function(err) {
    reject(formatError(err));
    self.errorHandled = true;
  };
}

function makeEndListener(client) {
  return function() {
    if (!client.endCalled) {
      console.error(`${client.clientName} Connection ended unexpectedly`);
    }
  };
}

function makeCloseListener(client) {
  return function() {
    if (!client.endCalled) {
      console.error(`${client.clientName}: Connection closed unexpectedly`);
    }
    client.sftp = undefined;
  };
}

function localExists(localPath) {
  return new Promise((resolve, reject) => {
    fs.stat(localPath, (err, stats) => {
      if (err) {
        console.dir(err);
        reject(err);
      }
      if (stats.isDirectory()) {
        resolve('d');
      } else if (stats.isSymbolicLink()) {
        resolve('l');
      } else if (stats.isFile()) {
        resolve('-');
      } else {
        resolve('');
      }
    });
  });
}

function classifyError(err, testPath) {
  if (err.code === 'EACCES') {
    return {
      msg: `Permission denied: ${testPath}`,
      code: constants.errorCode.permission
    };
  } else if (err.code === 'ENOENT') {
    return {
      msg: `No such file: ${testPath}`,
      code: constants.errorCode.notexist
    };
  }
  return {
    msg: err.message,
    code: err.code ? err.code : constants.errorCode.generic
  };
}

function testLocalAccess(testPath, mode = fs.constants.R_OK, full = true) {
  return new Promise((resolve, reject) => {
    try {
      let r = {
        path: testPath,
        valid: true
      };
      if (full) {
        fs.access(testPath, mode, err => {
          if (err) {
            let {msg, code} = classifyError(err, testPath);
            r.valid = false;
            r.msg = msg;
            r.code = code;
          }
          resolve(r);
        });
      } else {
        let dir = path.posix.parse(testPath).dir;
        fs.access(dir, mode, err => {
          if (err) {
            let {msg, code} = classifyError(err, dir);
            r.valid = false;
            r.msg = msg;
            r.code = code;
          }
          resolve(r);
        });
      }
    } catch (err) {
      reject(err);
    }
  });
}

async function localAccess(localPath, mode = fs.constants.R_OK, full = true) {
  try {
    let result = await testLocalAccess(localPath, mode);
    if (result.valid && full) {
      result.type = await localExists(result.path);
    } else if (result.valid && !full) {
      let dir = path.posix.parse(result.path).dir;
      result.type = await localExists(dir);
    }
    return result;
  } catch (err) {
    throw formatError(err, 'localAccess', constants.errorCode.generic);
  }
}

async function checkRemotePath(client, remotePath, full = false) {
  let result = {
    valid: true,
    path: remotePath,
    type: undefined,
    msg: '',
    code: ''
  };

  if (result.path.startsWith('..')) {
    let root = await client.realPath('..');
    result.path = root + client.remotePathSep + result.path.substring(3);
  } else if (result.path.startsWith('.')) {
    let root = await client.realPath('.');
    result.path = root + client.remotePathSep + result.path.substring(2);
  }
  let dir;
  if (full) {
    result.type = await client.exists(result.path);
  } else {
    dir = path.posix.parse(result.path).dir;
    result.type = await client.exists(dir);
  }
  if (!result.type) {
    if (full) {
      result.msg = `No such file: ${result.path}`;
      result.code = constants.errorCode.notexist;
      result.valid = false;
    } else {
      result.msg = `Bad path: ${dir}`;
      result.code = constants.errorCode.badPath;
      result.valid = false;
    }
  } else if (!full && result.type !== 'd') {
    result.msg = `Bad path: ${dir} must be a directory`;
    result.valid = false;
  }
  return result;
}

function haveConnection(client, name, reject) {
  if (!client.sftp) {
    let newError = formatError(
      'No SFTP connection available',
      name,
      constants.errorCode.connect
    );
    if (reject) {
      reject(newError);
      return false;
    } else {
      throw newError;
    }
  }
  return true;
}

module.exports = {
  formatError,
  handleError,
  removeListeners,
  makeErrorListener,
  makeEndListener,
  makeCloseListener,
  localExists,
  localAccess,
  checkRemotePath,
  haveConnection
};
