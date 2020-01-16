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
    msg = `${name}->${err.message}${retry}`;
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

/**
 * Tests an error to see if it is one which has already been customised
 * by this module or not. If not, applies appropriate customisation.
 *
 * @param {Error} err - an Error object
 * @param {String} name - name to be used in customised error message
 * @param {Function} reject - If defined, call this function instead of
 *                            throwing the error
 * @throws {Error}
 */
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
function makeErrorListener(reject, self, name) {
  return function(err) {
    self.errorHandled = true;
    console.debug('Error event caught by method error handler');
    reject(formatError(err, name));
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

/**
 * @async
 *
 * Tests to see if a path identifies an existing item. Returns either
 * 'd' = directory, 'l' = sym link or '-' regular file if item exists. Returns
 * false if it does not
 *
 * @param {String} localPath
 * @returns {Boolean | String}
 */
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

/**
 * Used by checkRemotePath and checkLocalPath to help ensure consistent
 * error messages.
 *
 * @param {Error} err - original error
 * @param {String} testPath - path associated with the error
 * @returns {Object} with properties of 'msg' and 'code'.
 */
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

function testLocalAccess(testPath, target) {
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

/**
 * @async
 *
 * Tests the provided path and returns an object with details that can
 * be used to determine appropriate action by the client. What is tested
 * depends on the target type -
 * readFile: target must be a file and must be readable
 * readDir: target must be a directory and must be readable
 * readObj: target can be either file or directory, but must be readable
 * writeFile: if target exists, must be a file and must be writeable
 * writeDir: if target exists, must be a directory and must be writeable
 * writeObj: if target exists, it must be writeable.
 *
 * If a write* target does not exist, a test is performed to ensure that the
 * parent is a directory. It is assumed for write* objects that the module
 * will create them if they don't exist.
 *
 * @param {String} testPath - path to test
 * @param {Number} target - Type of target (see constants.targetTye)
 * @returns {Object} Returned object has following properties
 * path: the real path (with '.' and '..' replaced etc)
 * valid: boolean - true if exists and is valid, false otherwise
 * msg: Error message - only if valid is false
 * code: Error coce - only if valid is false
 * parentValid: only if valid is false. Weather parent is a directory
 * parentMsg: Error message associated with parent when parenValid is false
 * parentCode: error code when parentValid is false
 */
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

async function normalizeRemotePath(client, aPath) {
  try {
    if (aPath.startsWith('..')) {
      let root = await client.realPath('..');
      return root + client.remotePathSep + aPath.substring(3);
    } else if (aPath.startsWith('.')) {
      let root = await client.realPath('.');
      return root + client.remotePathSep + aPath.substring(2);
    }
    return aPath;
  } catch (err) {
    throw formatError(err, 'normalizeRemotePath');
  }
}

function checkReadObject(aPath, type) {
  return {
    path: aPath,
    type: type,
    valid: type ? true : false,
    msg: type ? undefined : `No such file ${aPath}`,
    code: type ? undefined : errorCode.notexist
  };
}

function checkReadFile(aPath, type) {
  if (!type) {
    return {
      path: aPath,
      type: type,
      valid: false,
      msg: `No such file: ${aPath}`,
      code: errorCode.notexist
    };
  } else if (type === 'd') {
    return {
      path: aPath,
      type: type,
      valid: false,
      msg: `Bad path: ${aPath} must be a file`,
      code: errorCode.badPath
    };
  }
  return {
    path: aPath,
    type: type,
    valid: true
  };
}

function checkReadDir(aPath, type) {
  if (!type) {
    return {
      path: aPath,
      type: type,
      valid: false,
      msg: `No such directory: ${aPath}`,
      code: errorCode.notdir
    };
  } else if (type !== 'd') {
    return {
      path: aPath,
      type: type,
      valid: false,
      msg: `Bad path: ${aPath} must be a directory`,
      code: errorCode.badPath
    };
  }
  return {
    path: aPath,
    type: type,
    valid: true
  };
}

async function checkWriteFile(client, aPath, type) {
  if (type && type === 'd') {
    return {
      path: aPath,
      type: type,
      valid: false,
      msg: `Bad path: ${aPath} must be a regular file`,
      code: errorCode.badPath
    };
  } else if (!type) {
    let parentDir = path.posix.parse(aPath).dir;
    let parentType = await client.exists(parentDir);
    if (!parentType) {
      return {
        path: aPath,
        type: type,
        valid: false,
        msg: `Bad path: ${parentDir} parent not exist`,
        code: errorCode.badPath
      };
    } else if (parentType !== 'd') {
      return {
        path: aPath,
        type: type,
        valid: false,
        msg: `Bad path: ${parentDir} must be a directory`,
        code: errorCode.badPath
      };
    }
    return {
      path: aPath,
      type: type,
      valid: true
    };
  }
  return {
    path: aPath,
    type: type,
    valid: true
  };
}

async function checkWriteDir(client, aPath, type) {
  if (type && type !== 'd') {
    return {
      path: aPath,
      type: type,
      valid: false,
      msg: `Bad path: ${aPath} must be a directory`,
      code: errorCode.badPath
    };
  } else if (!type) {
    let parentDir = path.posix.parse(aPath).dir;
    let parentType = await client.exists(parentDir);
    if (parentType && parentType !== 'd') {
      return {
        path: aPath,
        type: type,
        valid: false,
        msg: `Bad path: ${parentDir} must be a directory`,
        code: errorCode.badPath
      };
    }
  }
  // don't care if parent does not exist as it might be created
  // via recursive call to mkdir.
  return {
    path: aPath,
    type: type,
    valid: true
  };
}

function checkWriteObject(aPath, type) {
  // for writeObj, not much error checking we can do
  // Just return path, type and valid indicator
  return {
    path: aPath,
    type: type,
    valid: true
  };
}

async function checkRemotePath(client, rPath, target = targetType.readFile) {
  let aPath = await normalizeRemotePath(client, rPath);
  let type = await client.exists(aPath);
  switch (target) {
    case targetType.readObj:
      return checkReadObject(aPath, type);
    case targetType.readFile:
      return checkReadFile(aPath, type);
    case targetType.readDir:
      return checkReadDir(aPath, type);
    case targetType.writeFile:
      return checkWriteFile(client, aPath, type);
    case targetType.writeDir:
      return checkWriteDir(client, aPath, type);
    case targetType.writeObj:
      return checkWriteObject(aPath, type);
    default:
      throw formatError(
        `Unknown target type: ${target}`,
        'checkRemotePath',
        errorCode.generic
      );
  }
}

/**
 * Check to see if there is an active sftp connection
 *
 * @param {Object} client - current sftp object
 * @param {String} name - name given to this connection
 * @param {Function} reject - if defined, call this rather than throw
 *                            an error
 * @returns {Boolean} True if connection OK
 * @throws {Error}
 */
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
  normalizeRemotePath,
  checkRemotePath,
  haveConnection
};
