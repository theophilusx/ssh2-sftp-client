'use strict';

const fs = require('fs');
const {errorCode} = require('./constants');

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

let tempListeners = [];

/**
 * Simple default error listener. Will reformat the error message and
 * throw a new error.
 *
 * @param {Error} err - source for defining new error
 * @throws {Error} Throws new error
 */
function errorListener(client, name, reject) {
  let fn = (err) => {
    if (!client.errorHandled) {
      client.errorHandled = true;
      if (reject) {
        reject(fmtError(err, name, err.code));
      } else {
        throw fmtError(err, name, err.code);
      }
    }
    client.debugMsg(`Handled Error: ${err.message} ${err.code}`);
  };
  tempListeners.push(['error', fn]);
  return fn;
}

function endListener(client, name, reject) {
  let fn = function () {
    client.debugMsg(`Handled end event for ${name}`);
    if (!client.endCalled) {
      client.sftp = undefined;
      if (reject) {
        reject(fmtError('Unexpected end event raised', name));
      } else {
        throw fmtError('Unexpected end event raised', name);
      }
    }
  };
  tempListeners.push(['end', fn]);
  return fn;
}

function closeListener(client, name, reject) {
  let fn = function () {
    client.debugMsg(`handled close event for ${name}`);
    if (!client.endCalled) {
      client.sftp = undefined;
      if (reject) {
        reject(fmtError('Unexpected close event raised', name));
      } else {
        throw fmtError('Unexpected close event raised', name);
      }
    }
  };
  tempListeners.push(['close', fn]);
  return fn;
}

function addTempListeners(obj, name, reject) {
  obj.client.prependListener('end', endListener(obj, name, reject));
  obj.client.prependListener('close', closeListener(obj, name, reject));
  obj.client.prependListener('error', errorListener(obj, name, reject));
}

function removeTempListeners(client) {
  tempListeners.forEach(([e, fn]) => {
    client.removeListener(e, fn);
  });
  tempListeners = [];
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

module.exports = {
  fmtError,
  errorListener,
  endListener,
  closeListener,
  addTempListeners,
  removeTempListeners,
  localExists,
  normalizeRemotePath,
  haveConnection
};
