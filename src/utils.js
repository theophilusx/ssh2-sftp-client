const fs = require('node:fs');
const path = require('node:path');
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

function globalListener(client, evt) {
  return () => {
    if (client.endCalled || client.errorHandled || client.closeHandled) {
      // we are processing an expected event handled elsewhere
      client.debugMsg(`Global ${evt} event: Ignoring expected and handled event`);
    } else {
      client.debugMsg(`Global ${evt} event: Handling unexpected event`);
      client.sftp = undefined;
    }
  };
}

function endListener(client, name) {
  const fn = function () {
    client.sftp = undefined;
    if (client.endCalled || client.endHandled || client.errorHandled) {
      // end event already handled - ignore
      client.debugMsg(`${name} endListener - handled end event`);
      return;
    }
    client.endHandled = true;
    client.debugMsg(`${name} Unexpected end event`);
  };
  return fn;
}

function closeListener(client, name) {
  const fn = function () {
    client.sftp = undefined;
    if (
      client.endCalled ||
      client.closeHandled ||
      client.errorHandled ||
      client.endHandled
    ) {
      // handled or expected close event - ignore
      client.debugMsg(`${name} closeListener - handled close event`);
      return;
    }
    client.closeHandled = true;
    client.debugMsg(`${name} Unexpected close event`);
  };
  return fn;
}

function addTempListeners(client, name, reject) {
  const listeners = {
    end: endListener(client, name),
    close: closeListener(client, name),
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
      case -2: {
        return {
          status: false,
          type: null,
          details: 'not exist',
          code: -2,
        };
      }
      case -13: {
        return {
          status: false,
          type: localExists(filePath),
          details: 'permission denied',
          code: -13,
        };
      }
      case -20: {
        return {
          status: false,
          type: null,
          details: 'parent not a directory',
        };
      }
      default: {
        return {
          status: false,
          type: null,
          details: err.message,
        };
      }
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
  if (!status) {
    // filePath does not exist. Can we create it?
    if (details === 'permission denied') {
      // don't have permission
      return {
        status,
        details,
        type,
      };
    }
    // to create it, parent must be directory and writeable
    const dirPath = path.dirname(filePath);
    const localCheck = haveLocalAccess(dirPath, 'w');
    if (!localCheck.status) {
      // no access to parent directory
      return {
        status: localCheck.status,
        details: `${dirPath}: ${localCheck.details}`,
        type: null,
      };
    }
    // exists, is it a directory?
    if (localCheck.type !== 'd') {
      return {
        status: false,
        details: `${dirPath}: not a directory`,
        type: null,
      };
    }
    return {
      status: true,
      details: 'access OK',
      type: null,
      code: 0,
    };
  }
  return { status, details, type };
}

async function normalizeRemotePath(client, aPath) {
  try {
    if (aPath.startsWith('..')) {
      const root = await client.realPath('..');
      return `${root}/${aPath.slice(3)}`;
    } else if (aPath.startsWith('.')) {
      const root = await client.realPath('.');
      return `${root}/${aPath.slice(2)}`;
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
      if (Number.isNaN(Number.parseInt(ms)) || ms < 0) {
        reject('Argument must be a number >= 0');
      } else {
        setTimeout(() => {
          resolve(true);
        }, ms);
      }
    } catch (err) {
      reject(err);
    }
  });
}

function partition(input, size) {
  let output = [];

  if (size < 1) {
    throw new Error('Partition size must be greater than zero');
  }

  for (let i = 0; i < input.length; i += size) {
    output[output.length] = input.slice(i, i + size);
  }
  return output;
}

module.exports = {
  globalListener,
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
  partition,
};
