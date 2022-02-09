'use strict';

const fs = require('fs');
const path = require('path');

const { errorCode } = require('./constants');

/**
 * Generate a new Error object with a reformatted error message which
 * is a little more informative and useful to users.
 *
 * @param {Error|string} err - The Error object the new error will be based on
 * @param {number} retryCount - For those functions which use retry. Number of
 *                              attempts to complete before giving up
 * @returns {Error} New error with custom error message
 */
function fmtError(err, name = 'sftp', eCode, retryCount) {
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
    code = eCode ? eCode : errorCode.generic;
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
      default:
        msg = `${name}: ${err.message}${retry}`;
    }
    code = err.code ? err.code : errorCode.generic;
  }
  let newError = new Error(msg);
  newError.code = code;
  newError.custom = true;
  return newError;
}

function addToTempListenerList(obj, name, evt, fn) {
  if (name in obj.tempListeners) {
    obj.tempListeners[name].push([evt, fn]);
  } else {
    obj.tempListeners[name] = [[evt, fn]];
  }
}

/**
 * Simple default error listener. Will reformat the error message and
 * throw a new error.
 *
 * @param {Error} err - source for defining new error
 * @throws {Error} Throws new error
 */
function errorListener(client, name, reject) {
  let fn = (err) => {
    if (client.endCalled || client.errorHandled) {
      client.debugMsg(`${name} Error: Ignoring handled error: ${err.message}`);
    } else {
      client.debugMsg(`${name} Error: Handling error: ${err.message}`);
      client.errorHandled = true;
      if (reject) {
        client.debugMsg(`${name} Error: handled error with reject`);
        reject(fmtError(err, name, err.code));
      } else {
        client.debugMsg(`${name} Error: handling error with throw`);
        throw fmtError(err, name, err.code);
      }
    }
  };
  addToTempListenerList(client, name, 'error', fn);
  return fn;
}

function endListener(client, name, reject) {
  let fn = function () {
    if (client.endCalled || client.endHandled) {
      client.debugMsg(`${name} End: Ignoring expected end event`);
    } else {
      client.debugMsg(`${name} End: Handling end event`);
      client.sftp = undefined;
      client.endHandled = true;
      if (reject) {
        client.debugMsg(`${name} End: handling end event with reject'`);
        reject(fmtError('Unexpected end event raised', name));
      } else {
        client.debugMsg(`${name} End: handling end event with throw`);
        throw fmtError('Unexpected end event raised', name);
      }
    }
  };
  addToTempListenerList(client, name, 'end', fn);
  return fn;
}

function closeListener(client, name, reject) {
  let fn = function () {
    if (client.endCalled || client.closeHandled) {
      client.debugMsg(`${name} Close: ignoring expected close event`);
    } else {
      client.debugMsg(`${name} Close: handling unexpected close event`);
      client.sftp = undefined;
      client.closeHandled = true;
      if (reject) {
        client.debugMsg(`${name} Close: handling close event with reject`);
        reject(fmtError('Unexpected close event raised', name));
      } else {
        client.debugMsg(`${name} Close: handling close event with throw`);
        throw fmtError('Unexpected close event raised', name);
      }
    }
  };
  addToTempListenerList(client, name, 'close', fn);
  return fn;
}

function addTempListeners(obj, name, reject) {
  obj.debugMsg(`${name}: Adding temp event listeners`);
  obj.client.prependListener('end', endListener(obj, name, reject));
  obj.client.prependListener('close', closeListener(obj, name, reject));
  obj.client.prependListener('error', errorListener(obj, name, reject));
}

function removeTempListeners(obj, name) {
  obj.debugMsg(`${name}: Removing temp event listeners`);
  if (name in obj.tempListeners) {
    obj.tempListeners[name].forEach(([e, fn]) => {
      obj.client.removeListener(e, fn);
    });
    obj.tempListeners[name] = [];
  }
}

/**
 * Checks to verify local object exists. Returns a character string representing the type
 * type of local object if it exists, false if it doesn't.
 *
 * Return codes: l = symbolic link
 *               - = regular file
 *               d = directory
 *               s = socket
 *
 * @param {string} filePath - path to local object
 * @returns {string | boolean} returns a string for object type if it exists, false otherwise
 */
function localExists(filePath) {
  const stats = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!stats) {
    return false;
  } else if (stats.isDirectory()) {
    return 'd';
  } else if (stats.isFile()) {
    return '-';
  } else {
    throw fmtError(
      `Bad path: ${filePath}: target must be a file or directory`,
      'localExists',
      errorCode.badPath
    );
  }
}

/**
 * Verify access to local object. Returns an object with properties for status, type,
 * details and code.
 *
 * return object {
 *                 status: true if exists and can be accessed, false otherwise
 *                 type: type of object '-' = file, 'd' = dir, 'l' = link, 's' = socket
 *                 details: 'access ok' if object can be accessed, 'not found' if
 *                          object does not exist, 'permission denied' if access denied
 *                 code: error code if object does not exist or permission denied
 *              }
 *
 * @param {string} filePath = path to local object
 * @param {string} mode = access mode - either 'r' or 'w'. Defaults to 'r'
 * @returns {Object} with properties status, type, details and code
 */
function haveLocalAccess(filePath, mode = 'r') {
  const accessMode =
    fs.constants.F_OK | (mode === 'w') ? fs.constants.W_OK : fs.constants.R_OK;

  try {
    fs.accessSync(filePath, accessMode);
    const type = localExists(filePath);
    return {
      status: true,
      type: type,
      details: 'access OK',
      code: 0,
    };
  } catch (err) {
    switch (err.errno) {
      case -2:
        return {
          status: false,
          type: null,
          details: 'not exist',
          code: -2,
        };
      case -13:
        return {
          status: false,
          type: localExists(filePath),
          details: 'permission denied',
          code: -13,
        };
      case -20:
        return {
          status: false,
          type: null,
          details: 'parent not a directory',
        };
      default:
        return {
          status: false,
          type: null,
          details: err.message,
        };
    }
  }
}

/**
 * Checks to verify the object specified by filePath can either be written to or created
 * if it doens't already exist. If it does not exist, checks to see if the parent entry in the
 * path is a directory and can be written to. Returns an object with the same format as the object
 * returned by 'haveLocalAccess'.
 *
 * @param {string} filePath - path to object to be created or written t
 * @returns {Object} Object with properties status, type, destils and code
 */
function haveLocalCreate(filePath) {
  const { status, details, type } = haveLocalAccess(filePath, 'w');
  if (!status && details === 'permission denied') {
    //throw new Error(`Bad path: ${filePath}: permission denied`);
    return {
      status,
      details,
      type,
    };
  } else if (!status) {
    const dirPath = path.dirname(filePath);
    const localCheck = haveLocalAccess(dirPath, 'w');
    if (localCheck.status && localCheck.type !== 'd') {
      //throw new Error(`Bad path: ${dirPath}: not a directory`);
      return {
        status: false,
        details: `${dirPath}: not a directory`,
        type: null,
      };
    } else if (!localCheck.status) {
      //throw new Error(`Bad path: ${dirPath}: ${localCheck.details}`);
      return {
        status: localCheck.status,
        details: `${dirPath}: ${localCheck.details}`,
        type: null,
      };
    } else {
      return {
        status: true,
        details: 'access OK',
        type: null,
        code: 0,
      };
    }
  }
  return { status, details, type };
}

async function normalizeRemotePath(client, aPath) {
  try {
    if (aPath.startsWith('..')) {
      let root = await client.realPath('..');
      return root + client.remotePathSep + aPath.slice(3);
    } else if (aPath.startsWith('.')) {
      let root = await client.realPath('.');
      return root + client.remotePathSep + aPath.slice(2);
    }
    return aPath;
  } catch (err) {
    throw fmtError(err, 'normalizeRemotePath');
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
    let newError = fmtError(
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

function sleep(ms) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => {
        resolve(true);
      }, ms);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  fmtError,
  addToTempListenerList,
  errorListener,
  endListener,
  closeListener,
  addTempListeners,
  removeTempListeners,
  haveLocalAccess,
  haveLocalCreate,
  normalizeRemotePath,
  localExists,
  haveConnection,
  sleep,
};
