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
  switch (err.code) {
    case 'EACCES':
      return {
        msg: `Permission denied: ${testPath}`,
        code: constants.errorCode.permission
      };
    case 'ENOENT':
      return {
        msg: `No such file: ${testPath}`,
        code: constants.errorCode.notexist
      };
    case 'ENOTDIR':
      return {
        msg: `Not a directory: ${testPath}`,
        code: constants.errorCode.notdir
      };
    default:
      return {
        msg: err.message,
        code: err.code ? err.code : constants.errorCode.generic
      };
  }
}

function testLocalAccess(testPath, target = constants.targetType.readFile) {
  return new Promise((resolve, reject) => {
    try {
      let r = {
        path: path.normalize(testPath),
        valid: true
      };
      switch (target) {
        case constants.targetType.readFile:
          fs.access(r.path, fs.constants.R_OK, err => {
            if (err) {
              let {msg, code} = classifyError(err, r.path);
              r.valid = false;
              r.msg = msg;
              r.code = code;
            }
            resolve(r);
          });
          break;
        case constants.targetType.readDir:
          fs.access(r.path, fs.constants.R_OK || fs.constants.X_OK, err => {
            if (err) {
              let {msg, code} = classifyError(err, r.path);
              r.valid = false;
              r.msg = msg;
              r.code = code;
            }
            resolve(r);
          });
          break;
        case constants.targetType.writeDir:
        case constants.targetType.writeFile:
          fs.access(r.path, fs.constants.W_OK, err => {
            if (err) {
              let {msg, code} = classifyError(err, r.path);
              r.valid = false;
              r.msg = msg;
              r.code = code;
            }
            if (!r.valid && r.code === constants.errorCode.notexist) {
              let dir = path.posix.parse(r.path).dir;
              fs.access(dir, fs.constants.W_OK, err => {
                if (err) {
                  let {msg, code} = classifyError(err, dir);
                  r.parentValid = false;
                  r.parentMsg = msg;
                  r.parentCode = code;
                } else {
                  r.parentValid = true;
                }
                resolve(r);
              });
            } else {
              resolve(r);
            }
          });
          break;

        default:
          reject(
            formatError(
              `Unknown target type: ${target}`,
              'testLocalAccess',
              constants.errorCode.generic
            )
          );
      }
    } catch (err) {
      reject(err);
    }
  });
}

async function checkLocalPath(
  testPath,
  target = constants.targetType.readFile
) {
  try {
    switch (target) {
      case constants.targetType.readFile: {
        let rslt = await testLocalAccess(testPath, target);
        if (rslt.valid) {
          rslt.type = await localExists(rslt.path);
          if (rslt.type !== '-') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a regular file`;
            rslt.code = constants.errorCode.badPath;
          }
        }
        return rslt;
      }
      case constants.targetType.readDir: {
        let rslt = await testLocalAccess(testPath, target);
        if (rslt.valid) {
          rslt.type = await localExists(rslt.path);
          if (rslt.type !== 'd') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a directory`;
            rslt.code = constants.errorCode.badPath;
          }
        }
        return rslt;
      }
      case constants.targetType.writeFile:
      case constants.targetType.writeDir: {
        let rslt = await testLocalAccess(testPath, target);
        if (rslt.valid) {
          rslt.type = await localExists(rslt.path);
          if (target === constants.targetType.writeFile && rslt.type !== '-') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a file`;
            rslt.code = constants.errorCode.badPath;
          } else if (rslt.type !== 'd') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a directory`;
            rslt.code = constants.errorCode.badPath;
          }
        } else if (rslt.parentValid) {
          let dir = path.posix.parse(rslt.path).dir;
          rslt.parentType = await localExists(dir);
          if (rslt.parentType !== 'd') {
            rslt.msg = `Bad path: ${dir} must be a directory`;
            rslt.code = constants.errorCode.badPath;
          } else {
            rslt.parentValid = true;
          }
        }
        return rslt;
      }
      default:
        throw new Error(`Unknown target type: ${target}`);
    }
  } catch (err) {
    throw formatError(err.message, 'checkLocalPath', err.code);
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
  checkLocalPath,
  checkRemotePath,
  haveConnection
};
