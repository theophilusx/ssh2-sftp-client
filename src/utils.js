'use strict';

const fs = require('fs');

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
  eCode = 'ERR_GENERIC_CLIENT',
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

function localRealpath(localPath) {
  return new Promise((resolve, reject) => {
    fs.realpath(localPath, 'utf8', (err, absPath) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(undefined);
        } else {
          reject(err);
        }
      }
      resolve(absPath);
    });
  });
}

function localAccess(localPath, mode) {
  return new Promise((resolve, reject) => {
    fs.access(localPath, mode, err => {
      if (err) {
        if (err.code === 'EACCES' || err.code === 'ENOENT') {
          resolve([false, err.code]);
        } else {
          reject(err);
        }
      }
      resolve([true, undefined]);
    });
  });
}

module.exports = {
  formatError,
  removeListeners,
  makeErrorListener,
  makeEndListener,
  makeCloseListener,
  localRealpath,
  localAccess
};
