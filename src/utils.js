'use strict';

const fs = require('fs');
const path = require('path');
const {errorCode, targetType} = require('./constants');

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
  eCode = errorCode.generic,
  retryCount
) {
  let msg = '';
  let code = '';
  let retry = retryCount
    ? ` after ${retryCount} ${retryCount > 1 ? 'attempts' : 'attempt'}`
    : '';

  if (err === undefined) {
    msg = `${name}: Undefined error - probably a bug!`;
    code = errorCode.generic;
  } else if (typeof err === 'string') {
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
        code: errorCode.permission
      };
    case 'ENOENT':
      return {
        msg: `No such file: ${testPath}`,
        code: errorCode.notexist
      };
    case 'ENOTDIR':
      return {
        msg: `Not a directory: ${testPath}`,
        code: errorCode.notdir
      };
    default:
      return {
        msg: err.message,
        code: err.code ? err.code : errorCode.generic
      };
  }
}

function testLocalAccess(testPath, target = targetType.readFile) {
  return new Promise((resolve, reject) => {
    try {
      let r = {
        path: path.normalize(testPath),
        valid: true
      };
      switch (target) {
        case targetType.readFile:
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
        case targetType.readDir:
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
        case targetType.writeDir:
        case targetType.writeFile:
          fs.access(r.path, fs.constants.W_OK, err => {
            if (err) {
              let {msg, code} = classifyError(err, r.path);
              r.valid = false;
              r.msg = msg;
              r.code = code;
            }
            if (!r.valid && r.code === errorCode.notexist) {
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
              errorCode.generic
            )
          );
      }
    } catch (err) {
      reject(err);
    }
  });
}

async function checkLocalPath(testPath, target = targetType.readFile) {
  try {
    switch (target) {
      case targetType.readFile: {
        let rslt = await testLocalAccess(testPath, target);
        if (rslt.valid) {
          rslt.type = await localExists(rslt.path);
          if (rslt.type !== '-') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a regular file`;
            rslt.code = errorCode.badPath;
          }
        }
        return rslt;
      }
      case targetType.readDir: {
        let rslt = await testLocalAccess(testPath, target);
        if (rslt.valid) {
          rslt.type = await localExists(rslt.path);
          if (rslt.type !== 'd') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a directory`;
            rslt.code = errorCode.badPath;
          }
        }
        return rslt;
      }
      case targetType.writeFile:
      case targetType.writeDir: {
        let rslt = await testLocalAccess(testPath, target);
        if (rslt.valid) {
          rslt.type = await localExists(rslt.path);
          if (target === targetType.writeFile && rslt.type === 'd') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a file`;
            rslt.code = errorCode.badPath;
          } else if (target === targetType.writeDir && rslt.type !== 'd') {
            rslt.valid = false;
            rslt.msg = `Bad path: ${rslt.path} must be a directory`;
            rslt.code = errorCode.badPath;
          }
        } else {
          let dir = path.posix.parse(rslt.path).dir;
          rslt.parentType = await localExists(dir);
          if (rslt.parentType !== 'd') {
            rslt.msg = `Bad path: ${dir} must be a directory`;
            rslt.code = errorCode.badPath;
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

async function checkRemotePath(
  client,
  remotePath,
  target = targetType.readFile
) {
  let result = {
    path: remotePath,
    valid: true,
    parentValid: true
  };

  if (result.path.startsWith('..')) {
    let root = await client.realPath('..');
    result.path = root + client.remotePathSep + result.path.substring(3);
  } else if (result.path.startsWith('.')) {
    let root = await client.realPath('.');
    result.path = root + client.remotePathSep + result.path.substring(2);
  }
  result.type = await client.exists(result.path);
  switch (target) {
    case targetType.readObj:
      if (!result.type) {
        result.valid = false;
        result.msg = `No such file ${result.path}`;
        result.code = errorCode.notexist;
      }
      return result;
    case targetType.readFile:
      if (!result.type) {
        result.valid = false;
        result.msg = `No such file: ${result.path}`;
        result.code = errorCode.notexist;
      } else if (result.type === 'd') {
        result.valid = false;
        result.msg = `Bad path: ${result.path} must be a file`;
        result.code = errorCode.badPath;
      }
      return result;
    case targetType.readDir:
      if (!result.type) {
        result.valid = false;
        result.msg = `No such directory: ${result.path}`;
        result.code = errorCode.notdir;
      } else if (result.type !== 'd') {
        result.valid = false;
        result.msg = `Bad path: ${result.path} must be a directory`;
        result.code = errorCode.badPath;
      }
      return result;
    case targetType.writeFile:
      if (result.type && result.type === 'd') {
        result.valid = false;
        result.msg = `Bad path: ${result.path} must be a regular file`;
        result.code = errorCode.badPath;
      } else if (!result.type) {
        result.valid = false;
        result.msg = `No such file: ${result.path}`;
        result.code = errorCode.notexist;
        let dir = path.posix.parse(result.path).dir;
        result.parentType = await client.exists(dir);
        if (!result.parentType) {
          result.parentValid = false;
          result.parentMsg = `No such directory: ${dir}`;
          result.parentCode = errorCode.notdir;
        } else if (result.parentType !== 'd') {
          result.parentValid = false;
          result.parentMsg = `Bad path: ${dir} must be a directory`;
          result.parentCode = errorCode.badPath;
        }
      }
      return result;
    case targetType.writeDir:
      if (result.type && result.type !== 'd') {
        result.valid = false;
        result.msg = `Bad path: ${result.path} must be a directory`;
        result.code = errorCode.badPath;
      } else if (!result.type) {
        result.valid = false;
        result.msg = `No such directory: ${result.path}`;
        result.code = errorCode.notdir;
        let dir = path.posix.parse(result.path).dir;
        result.parentType = await client.exists(dir);
        if (!result.parentType) {
          result.parentValid = false;
          result.parentMsg = `No such directory: ${dir}`;
          result.parentCode = errorCode.notdir;
        } else if (result.parentType !== 'd') {
          result.parentValid = false;
          result.parentMsg = `Bad path: ${dir} must be a directory`;
          result.parentCode = errorCode.badPath;
        }
      }
      return result;
    case targetType.writeObj:
      if (!result.type) {
        result.valid = false;
        result.msg = `No such file: ${result.path}`;
        result.code = errorCode.notexist;
        let dir = path.posix.parse(result.path).dir;
        result.parentType = await client.exists(dir);
        if (!result.parentType) {
          result.parentValid = false;
          result.parentMsg = `No such directory ${dir}`;
          result.code = errorCode.notdir;
        } else if (result.parentType !== 'd') {
          result.parentValid = false;
          result.parentMsg = `Bad path: ${dir} must be a directory`;
          result.parentCode = errorCode.badPath;
        }
      }
      return result;
    default:
      throw formatError(
        `Unknown target type: ${target}`,
        'checkRemotePath',
        errorCode.generic
      );
  }
}

function haveConnection(client, name, reject) {
  if (!client.sftp) {
    let newError = formatError(
      'No SFTP connection available',
      name,
      errorCode.connect
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
