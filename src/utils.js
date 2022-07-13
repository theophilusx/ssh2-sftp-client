const fs = require('fs');
const path = require('path');
const { errorCode } = require('./constants');

/**
 * Simple default error listener. Will reformat the error message and
 * throw a new error.
 *
 * @param {Error} err - source for defining new error
 * @throws {Error} Throws new error
 */
function errorListener(client, name, reject) {
  const fn = (err) => {
    if (client.endCalled || client.errorHandled) {
      // error already handled or expected - ignore
      client.debugMsg(`${name} errorListener - ignoring handled error`);
      return;
    }
    client.errorHandled = true;
    const newError = new Error(`${name}: ${err.message}`);
    newError.code = err.code;
    if (reject) {
      reject(newError);
    } else {
      throw newError;
    }
  };
  return fn;
}

function endListener(client, name, reject) {
  const fn = function () {
    client.sftp = undefined;
    if (client.endCalled || client.endHandled || client.errorHandled) {
      // end event already handled - ignore
      client.debugMsg(`${name} endListener - ignoring handled error`);
      return;
    }
    client.endHandled = true;
    client.debugMsg(`${name} Unexpected end event - ignoring`);
    // Don't reject/throw error, just log it and move on
    // after invalidating the connection
    // const err = new Error(`${name} Unexpected end event raised`);
    // if (reject) {
    //   reject(err);
    // } else {
    //   throw err;
    // }
  };
  return fn;
}

function closeListener(client, name, reject) {
  const fn = function () {
    client.sftp = undefined;
    if (
      client.endCalled ||
      client.closeHandled ||
      client.errorHandled ||
      client.endHandled
    ) {
      // handled or expected close event - ignore
      client.debugMsg(`${name} closeListener - ignoring handled error`);
      return;
    }
    client.closeHandled = true;
    client.debugMsg(`${name} Unexpected close event raised - ignoring`);
    // Don't throw/reject on close events. Just invalidate the connection
    // and move on.
    // const err = new Error(`${name}: Unexpected close event raised`);
    // if (reject) {
    //   reject(err);
    // } else {
    //   throw err;
    // }
  };
  return fn;
}

function addTempListeners(client, name, reject) {
  const listeners = {
    end: endListener(client, name, reject),
    close: closeListener(client, name, reject),
    error: errorListener(client, name, reject),
  };
  client.on('end', listeners.end);
  client.on('close', listeners.close);
  client.on('error', listeners.error);
  client._resetEventFlags();
  return listeners;
}

function removeTempListeners(client, listeners, name) {
  try {
    client.removeListener('end', listeners.end);
    client.removeListener('close', listeners.close);
    client.removeListener('error', listeners.error);
  } catch (err) {
    throw new Error(`${name}: Error removing temp listeners: ${err.message}`);
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
    const err = new Error(`Bad path: ${filePath}: target must be a file or directory`);
    err.code = errorCode.badPath;
    throw err;
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
      const root = await client.realPath('..');
      return root + client.remotePathSep + aPath.slice(3);
    } else if (aPath.startsWith('.')) {
      const root = await client.realPath('.');
      return root + client.remotePathSep + aPath.slice(2);
    }
    return aPath;
  } catch (err) {
    throw new Error(`normalizeRemotePath: ${err.message}`);
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
    const newError = new Error(`${name}: No SFTP connection available`);
    newError.code = errorCode.connect;
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
