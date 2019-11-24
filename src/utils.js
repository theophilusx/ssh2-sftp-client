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
function formatError(err, name = 'sftp', retryCount) {
  let msg = '';

  //console.dir(err);

  if (typeof err === 'string') {
    msg = `${name}: ${err}`;
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
      case 'ENOENT':
        msg = `${name}: ${err.message}`;
        break;
      default:
        msg = `${name}: ${err.message}`;
    }
  }

  if (retryCount) {
    msg += ` after ${retryCount} ${retryCount > 1 ? 'attempts' : 'attempt'}`;
  }
  return new Error(msg);
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
function makeErrorListener(name) {
  return function(err) {
    throw formatError(err, name);
  };
}

function makeEndListener(client) {
  return function() {
    if (!client.endCalled) {
      client.sftp = undefined;
      throw formatError('Connection ended unexpectedly', client.clientName);
    }
  };
}

module.exports = {
  formatError,
  removeListeners,
  makeErrorListener,
  makeEndListener
};