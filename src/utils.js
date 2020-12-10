'use strict';

const {prependListener} = require('cluster');
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
function formatError(err, name = 'sftp', eCode, retryCount) {
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
      case 'ENOENT':
        msg = `${name}: ${err.message}${retry}`;
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
      throw formatError(err, name, err.code);
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
  listeners.forEach((name) => {
    emitter.removeAllListeners(name);
  });
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
  let fn = function (err) {
    if (!client.errorHandled) {
      client.errorHandled = true;
      if (reject) {
        reject(formatError(err, name, err.code));
      } else {
        throw formatError(err, name, err.code);
      }
    }
    client.debugMsg(`Handled Error: ${err.message} ${err.code}`);
  };
  tempListeners.push(['error', fn]);
  return fn;
}

function endListener(client, name, reject) {
  let fn = function () {
    if (!client.endCalled) {
      if (reject) {
        reject(formatError('Unexpected end event raised', name));
      } else {
        throw formatError('Unexpected end event raised', name);
      }
    }
    client.debugMsg(`Handled end event for ${name}`);
    client.sftp = undefined;
  };
  tempListeners.push(['end', fn]);
  return fn;
}

function closeListener(client, name, reject) {
  let fn = function () {
    if (!client.endCalled) {
      if (reject) {
        reject(formatError('Unexpected close event raised', name));
      } else {
        throw formatError('Unexpected close event raised', name);
      }
    }
    client.debugMsg(`handled close event for ${name}`);
    client.sftp = undefined;
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
    throw formatError(err, 'normalizeRemotePath');
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

function hasListener(emitter, eventName, listenerName) {
  let listeners = emitter.listeners(eventName);
  let matches = listeners.filter((l) => l.name == listenerName);
  return matches.length === 0 ? false : true;
}

module.exports = {
  formatError,
  handleError,
  removeListeners,
  errorListener,
  endListener,
  closeListener,
  addTempListeners,
  removeTempListeners,
  localExists,
  normalizeRemotePath,
  haveConnection,
  dumpListeners,
  hasListener
};
