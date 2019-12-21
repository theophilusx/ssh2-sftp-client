'use strict';

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

  //console.dir(err);

  if (typeof err === 'string') {
    msg = `${name}: ${err}`;
    code = eCode;
  } else {
    switch (err.code) {
      case 'ENOTFOUND':
        msg =
          `${name}: ` +
          `${err.level} error. Address lookup failed for host ${err.hostname}`;
        break;
      case 'ECONNREFUSED':
        msg =
          `${name}: ${err.level} error. Remote host at ` +
          `${err.address} refused connection`;
        break;
      case 'ECONNRESET':
        msg = `${name}: Remote host has reset the connection: ${err.message}`;
        break;
      case 'ENOENT':
        msg = `${name}: ${err.message}`;
        break;
      default:
        msg = `${name}: ${err.message}`;
    }
    if (err.code) {
      code = err.code;
    } else {
      code = eCode;
    }
  }

  if (retryCount) {
    msg += ` after ${retryCount} ${retryCount > 1 ? 'attempts' : 'attempt'}`;
  }
  let theError = new Error(msg);
  theError.code = code;
  return theError;
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
function makeErrorListener(reject) {
  return function(err) {
    reject(formatError(err));
  };
}

function makeEndListener(client) {
  return function() {
    if (!client.endCalled) {
      console.log(`${client.clientName} Connection ended unexpectedly`);
      //client.sftp = undefined;
    }
  };
}

function makeCloseListener(client) {
  return function() {
    if (!client.endCalled) {
      console.log(`${client.clientName}: Connection closed unexpectedly`);
      client.sftp = undefined;
    }
  };
}

module.exports = {
  formatError,
  removeListeners,
  makeErrorListener,
  makeEndListener,
  makeCloseListener
};
