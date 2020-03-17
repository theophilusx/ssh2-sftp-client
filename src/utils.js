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
    reject(formatError(err, name));
  };
}

function makeEndListener(client) {
  return function() {
    if (!client.endCalled) {
      console.error(
        `${client.clientName} End Listener: Connection ended unexpectedly`
      );
    }
  };
}

function makeCloseListener(client, reject, name) {
  return function() {
    if (!client.endCalled) {
      if (reject) {
        reject(formatError('Connection closed unepectedly', name));
      } else {
        console.error(`${client.clientName}: Connection closed unexpectedly`);
      }
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
        if (err.code === 'ENOENT') {
          resolve(false);
        } else {
          reject(err);
        }
      } else {
        if (stats.isDirectory()) {
          resolve('d');
        } else if (stats.isSymbolicLink()) {
          resolve('l');
        } else if (stats.isFile()) {
          resolve('-');
        } else {
          resolve('');
        }
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

function localAccess(localPath, mode) {
  return new Promise(resolve => {
    fs.access(localPath, mode, err => {
      if (err) {
        let {msg, code} = classifyError(err, localPath);
        resolve({
          path: localPath,
          valid: false,
          msg: msg,
          code: code
        });
      } else {
        resolve({
          path: localPath,
          valid: true
        });
      }
    });
  });
}

async function checkLocalReadFile(localPath, localType) {
  try {
    let rslt = {
      path: localPath,
      type: localType
    };
    if (localType === 'd') {
      rslt.valid = false;
      rslt.msg = `Bad path: ${localPath} must be a file`;
      rslt.code = errorCode.badPath;
      return rslt;
    } else {
      let access = await localAccess(localPath, fs.constants.R_OK);
      if (access.valid) {
        rslt.valid = true;
        return rslt;
      } else {
        rslt.valid = false;
        rslt.msg = access.msg;
        rslt.code = access.code;
        return rslt;
      }
    }
  } catch (err) {
    throw formatError(err, 'checkLocalReadFile');
  }
}

async function checkLocalReadDir(localPath, localType) {
  try {
    let rslt = {
      path: localPath,
      type: localType
    };
    if (!localType) {
      rslt.valid = false;
      rslt.msg = `No such directory: ${localPath}`;
      rslt.code = errorCode.notdir;
      return rslt;
    } else if (localType !== 'd') {
      rslt.valid = false;
      rslt.msg = `Bad path: ${localPath} must be a directory`;
      rslt.code = errorCode.badPath;
      return rslt;
    } else {
      let access = await localAccess(
        localPath,
        fs.constants.R_OK | fs.constants.X_OK
      );
      if (!access.valid) {
        rslt.valid = false;
        rslt.msg = access.msg;
        rslt.code = access.code;
        return rslt;
      }
      rslt.valid = true;
      return rslt;
    }
  } catch (err) {
    throw formatError(err, 'checkLocalReadDir');
  }
}

async function checkLocalWriteFile(localPath, localType) {
  try {
    let rslt = {
      path: localPath,
      type: localType
    };
    if (localType === 'd') {
      rslt.valid = false;
      rslt.msg = `Bad path: ${localPath} must be a file`;
      rslt.code = errorCode.badPath;
      return rslt;
    } else if (!localType) {
      let dir = path.parse(localPath).dir;
      let parent = await localAccess(dir, fs.constants.W_OK);
      if (parent.valid) {
        rslt.valid = true;
        return rslt;
      } else {
        rslt.valid = false;
        rslt.msg = parent.msg;
        rslt.code = parent.code;
        return rslt;
      }
    } else {
      let access = await localAccess(localPath, fs.constants.W_OK);
      if (access.valid) {
        rslt.valid = true;
        return rslt;
      } else {
        rslt.valid = false;
        rslt.msg = access.msg;
        rslt.code = access.code;
        return rslt;
      }
    }
  } catch (err) {
    throw formatError(err, 'checkLocalWriteFile');
  }
}

async function checkLocalWriteDir(localPath, localType) {
  try {
    let rslt = {
      path: localPath,
      type: localType
    };
    if (!localType) {
      let parent = path.parse(localPath).dir;
      let access = await localAccess(parent, fs.constants.W_OK);
      if (access.valid) {
        rslt.valid = true;
        return rslt;
      } else {
        rslt.valid = false;
        rslt.msg = access.msg;
        rslt.code = access.code;
        return rslt;
      }
    } else if (localType !== 'd') {
      rslt.valid = false;
      rslt.msg = `Bad path: ${localPath} must be a directory`;
      rslt.code = errorCode.badPath;
      return rslt;
    } else {
      let access = await localAccess(localPath, fs.constants.W_OK);
      if (access.valid) {
        rslt.valid = true;
        return rslt;
      } else {
        rslt.valid = false;
        rslt.msg = access.msg;
        rslt.code = access.code;
        return rslt;
      }
    }
  } catch (err) {
    throw formatError(err, 'checkLocalWriteDir');
  }
}

async function checkLocalPath(lPath, target = targetType.readFile) {
  try {
    let localPath = path.normalize(lPath);
    let type = await localExists(localPath);
    switch (target) {
      case targetType.readFile:
        return checkLocalReadFile(localPath, type);
      case targetType.readDir:
        return checkLocalReadDir(localPath, type);
      case targetType.writeFile:
        return checkLocalWriteFile(localPath, type);
      case targetType.writeDir:
        return checkLocalWriteDir(localPath, type);
      default:
        return {
          path: localPath,
          type: type,
          valid: true
        };
    }
  } catch (err) {
    throw formatError(err, 'checkLocalPath');
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
    let parentDir = path.parse(aPath).dir;
    if (!parentDir) {
      return {
        path: aPath,
        type: false,
        valid: false,
        msg: `Bad path: ${aPath} cannot determine parent directory`,
        code: errorCode.badPath
      };
    }
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
    let parentDir = path.parse(aPath).dir;
    if (!parentDir) {
      return {
        path: aPath,
        type: false,
        valid: false,
        msg: `Bad path: ${aPath} cannot determine directory parent`,
        code: errorCode.badPath
      };
    }
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

function dumpListeners(emitter) {
  let eventNames = emitter.eventNames();
  if (eventNames.length) {
    console.log('Listener Data');
    eventNames.map(n => {
      console.log(`${n}: ${emitter.listenerCount(n)}`);
    });
  }
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
  haveConnection,
  dumpListeners
};
