/**
 * ssh2 sftp client for node
 */

'use strict';

const Client = require('ssh2').Client;
const fs = require('fs');
const concat = require('concat-stream');
const retry = require('retry');
const {posix, normalize} = require('path');
const utils = require('./utils');

const errorCode = {
  generic: 'ERR_GENERIC_CLIENT',
  connect: 'ERR_NOT_CONNECTED',
  badPath: 'ERR_BAD_PATH',
  permission: 'ERR_NO_PERMISSON'
};

let SftpClient = function(clientName = '') {
  this.client = new Client();
  this.clientName = clientName;
  this.endCalled = false;
  this.remotePathSep = '/';
  this.remotePlatform = 'unix';
};

SftpClient.prototype.realPath = function(path) {
  const self = this;
  const sftp = self.sftp;
  let errorListener;
  return new Promise((resolve, reject) => {
    try {
      if (!sftp) {
        reject(
          utils.formatError(
            'No SFTP connection available',
            'sftp.realPath',
            errorCode.connect
          )
        );
      } else {
        errorListener = utils.makeErrorListener(reject);
        self.on('error', errorListener);
        sftp.realpath(path, (err, absPath) => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${path}`,
                'sftp.realPath',
                err.code
              )
            );
            self.removeListener('error', errorListener);
          }
          resolve(absPath);
          self.removeListener('error', errorListener);
        });
      }
    } catch (err) {
      reject(
        utils.formatError(`${err.message} ${path}`, 'sftp.realPath', err.code)
      );
      self.removeListener('error', errorListener);
    }
  });
};

SftpClient.prototype.cwd = function() {
  return this.realPath('.');
};

SftpClient.prototype._list = function(path, pattern = /.*/) {
  const self = this;
  const reg = /-/gi;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.readdir(path, (err, list) => {
      if (err) {
        reject(
          utils.formatError(`${err.message} ${path}`, 'sftp.list', err.code)
        );
        self.removeListener('error', errorListener);
      } else {
        let newList = [];
        // reset file info
        if (list) {
          newList = list.map(item => {
            return {
              type: item.longname.substr(0, 1),
              name: item.filename,
              size: item.attrs.size,
              modifyTime: item.attrs.mtime * 1000,
              accessTime: item.attrs.atime * 1000,
              rights: {
                user: item.longname.substr(1, 3).replace(reg, ''),
                group: item.longname.substr(4, 3).replace(reg, ''),
                other: item.longname.substr(7, 3).replace(reg, '')
              },
              owner: item.attrs.uid,
              group: item.attrs.gid
            };
          });
        }
        // provide some compatibility for auxList
        let regex;
        if (pattern instanceof RegExp) {
          regex = pattern;
        } else {
          let newPattern = pattern.replace(/\*([^*])*?/gi, '.*');
          regex = new RegExp(newPattern);
        }
        resolve(newList.filter(item => regex.test(item.name)));
        self.removeListener('error', errorListener);
      }
    });
  });
};

/**
 * Retrieves a directory listing. The pattern argument may be a regular expression
 * or simple 'glob' style *.
 *
 * @param {String} path, a string containing the path to a directory
 * @param {regex} pattern - An optional pattern used to filter the list
 * @return {Promise} data, list info
 */
SftpClient.prototype.list = async function(path, pattern = /.*/) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.list',
      errorCode.connect
    );
  }
  let absPath = await this.realPath(path);
  return this._list(absPath, pattern);
};

/**
 * Retrieves a directory listing with a filter
 *
 * @param {String} path, a string containing the path to a directory
 * @param {String} pattern, a string containing the path
 * @return {Promise} data, list info
 *
 * @deprecated Please use list() instead.
 */
SftpClient.prototype.auxList = function(path, pattern = '*') {
  console.log(
    'auxList is deprecated and will be removed. Please use lis() instead'
  );
  return this.list(path, pattern);
};

SftpClient.prototype._exists = function(path) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = this.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    let {dir, base} = posix.parse(path);
    if (!base) {
      // at root
      resolve('d');
      self.removeListener('error', errorListener);
    } else {
      sftp.readdir(dir, (err, list) => {
        if (err) {
          if (err.code === 2) {
            resolve(false);
          } else {
            reject(utils.formatError(err, 'sftp.exists'));
          }
          self.removeListener('error', errorListener);
        } else {
          let [type] = list
            .filter(item => item.filename === base)
            .map(item => item.longname.substr(0, 1));
          if (type) {
            resolve(type);
          } else {
            resolve(false);
          }
          self.removeListener('error', errorListener);
        }
      });
    }
  });
};

/**
 * @async

 * Tests to see if an object exists. If it does, return the type of that object
 * (in the format returned by list). If it does not exist, return false.
 *
 * @param {string} path - path to the object on the sftp server.
 *
 * @return {boolean} returns false if object does not exist. Returns type of
 *                   object if it does
 */
SftpClient.prototype.exists = async function(remotePath) {
  try {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'sftp.exists',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(remotePath);
    if (remotePath === '.') {
      // the '.' path will always exist and is always a directory
      return 'd';
    }
    return this._exists(absPath);
  } catch (err) {
    if (err.code === 2) {
      return false;
    }
    throw utils.formatError(err, 'sftp.exists');
  }
};

SftpClient.prototype._stat = function(remotePath) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.stat(remotePath, function(err, stats) {
      if (err) {
        reject(
          utils.formatError(
            `${err.message} ${remotePath}`,
            'sftp.stat',
            err.code
          )
        );
        self.removeListener('error', errorListener);
      } else {
        resolve({
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid,
          size: stats.size,
          accessTime: stats.atime * 1000,
          modifyTime: stats.mtime * 1000,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          isBlockDevice: stats.isBlockDevice(),
          isCharacterDevice: stats.isCharacterDevice(),
          isSymbolicLink: stats.isSymbolicLink(),
          isFIFO: stats.isFIFO(),
          isSocket: stats.isSocket()
        });
        self.removeListener('error', errorListener);
      }
    });
  });
};

/**
 * Retrieves attributes for path
 *
 * @param {String} path, a string containing the path to a file
 * @return {Promise} stats, attributes info
 */
SftpClient.prototype.stat = async function(remotePath) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.stat',
      errorCode.connect
    );
  }
  let absPath = await this.realPath(remotePath);
  return this._stat(absPath);
};

SftpClient.prototype._get = function(path, dst, options) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    let rdr = sftp.createReadStream(path, options);
    rdr.on('error', err => {
      utils.removeListeners(rdr);
      reject(utils.formatError(`${err.message} ${path}`, 'sftp.get', err.code));
      self.removeListener('error', errorListener);
    });

    if (dst === undefined) {
      // no dst specified, return buffer of data
      let concatStream = concat(buff => {
        rdr.removeAllListeners('error');
        resolve(buff);
        self.removeListener('error', errorListener);
      });
      rdr.pipe(concatStream);
    } else {
      let wtr;
      if (typeof dst === 'string') {
        // dst local file path
        wtr = fs.createWriteStream(dst);
      } else {
        // assume dst is a writeable
        wtr = dst;
      }
      wtr.on('error', err => {
        utils.removeListeners(rdr);
        reject(
          utils.formatError(
            `${err.message} ${typeof dst === 'string' ? dst : ''}`,
            'sftp.get',
            err.code
          )
        );
        self.removeListener('error', errorListener);
      });
      wtr.on('finish', () => {
        utils.removeListeners(rdr);
        if (typeof dst === 'string') {
          resolve(dst);
        } else {
          resolve(wtr);
        }
        self.removeListener('error', errorListener);
      });
      rdr.pipe(wtr);
    }
  });
};

/**
 * get file
 *
 * If a dst argument is provided, it must be either a string, representing the
 * local path to where the data will be put, a stream, in which case data is
 * piped into the stream or undefined, in which case the data is returned as
 * a Buffer object.
 *
 * @param {String} path, remote file path
 * @param {string|stream|undefined} dst, data destination
 * @param {Object} userOptions, options passed to get
 *
 * @return {Promise}
 */
SftpClient.prototype.get = async function(path, dst, options) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.get',
      errorCode.connect
    );
  }

  let absPath = await this.realPath(path);

  let stats = await this.stat(absPath);
  if ((stats.mode & 0o444) === 0) {
    throw utils.formatError(
      `No read permission for ${absPath}`,
      'sftp.get',
      errorCode.permission
    );
  }

  if (typeof dst === 'string') {
    let dstPath = normalize(dst);
    return this._get(absPath, dstPath, options);
  }
  return this._get(absPath, dst, options);
};

SftpClient.prototype._fastGet = function(remotePath, localPath, options) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.fastGet(remotePath, localPath, options, function(err) {
      if (err) {
        reject(
          utils.formatError(
            `${err.message} ${remotePath}`,
            'sftp.fastGet',
            err.code
          )
        );
      }
      resolve(`${remotePath} was successfully download to ${localPath}!`);
      self.removeListener('error', errorListener);
    });
  });
};

/**
 * Use SSH2 fastGet for downloading the file.
 * Downloads a file at remotePath to localPath using parallel reads
 * for faster throughput.
 *
 * See 'fastGet' at https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
 *
 * @param {String} remotePath
 * @param {String} localPath
 * @param {Object} options
 * @return {Promise} the result of downloading the file
 */
SftpClient.prototype.fastGet = async function(remotePath, localPath, options) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.fastGet',
      errorCode.connect
    );
  }
  let src = await this.realPath(remotePath);
  let dst = normalize(localPath);
  return this._fastGet(src, dst, options);
};

SftpClient.prototype._fastPut = function(localPath, remotePath, options) {
  const self = this;
  const sftp = self.sftp;
  let errorListener;

  return new Promise((resolve, reject) => {
    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.fastPut(localPath, remotePath, options, function(err) {
      if (err) {
        reject(
          utils.formatError(
            `${err.message} Local: ${localPath} Remote: ${remotePath}`,
            'sftp.fastPut',
            err.code
          )
        );
      }
      resolve(`${localPath} was successfully uploaded to ${remotePath}!`);
      self.removeListener('error', errorListener);
    });
  });
};

/**
 * Use SSH2 fastPut for uploading the file.
 * Uploads a file from localPath to remotePath using parallel reads
 * for faster throughput.
 *
 * See 'fastPut' at
 * https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
 *
 * @param {String} localPath
 * @param {String} remotePath
 * @param {Object} options
 * @return {Promise} the result of downloading the file
 */
SftpClient.prototype.fastPut = async function(localPath, remotePath, options) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.fastPut',
      errorCode.connect
    );
  }
  let src = fs.realpathSync(localPath);
  let dst = remotePath;
  if (dst.startsWith('..')) {
    let root = await this.realPath('..');
    dst = root + this.remotePathSep + dst.substring(3);
  } else if (dst.startsWith('.')) {
    let root = await this.realPath('.');
    dst = root + this.remotePathSep + dst.substring(2);
  }
  return this._fastPut(src, dst, options);
};

SftpClient.prototype._put = function(src, remotePath, options) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    let stream = sftp.createWriteStream(remotePath, options);

    stream.on('error', err => {
      reject(
        utils.formatError(`${err.message} ${remotePath}`, 'sftp.put', err.code)
      );
      self.removeListener('error', errorListener);
    });

    stream.on('finish', () => {
      utils.removeListeners(stream);
      resolve(`Uploaded data stream to ${remotePath}`);
      self.removeListener('error', errorListener);
    });

    if (src instanceof Buffer) {
      stream.end(src);
    } else {
      let rdr;
      if (typeof src === 'string') {
        rdr = fs.createReadStream(src);
      } else {
        rdr = src;
      }
      rdr.on('error', err => {
        utils.removeListeners(stream);
        reject(
          utils.formatError(
            `${err.message} ${typeof src === 'string' ? src : ''}`,
            'sftp.put',
            err.code
          )
        );
        self.removeListener('error', errorListener);
      });
      rdr.pipe(stream);
    }
  });
};

/**
 * Create file a file on the remote server. The 'src' argument
 * can be a buffer, string or read stream. If 'src' is a string, it
 * should be the path to a local file.
 *
 * @param  {String|Buffer|stream} src - source data to use
 * @param  {String} remotePath - path to remote file
 * @param  {Object} options - options used for write stream configuration
 *                            value supported by node streams.
 * @return {Promise}
 */
SftpClient.prototype.put = async function(localSrc, remotePath, options) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connections available',
      'sftp.put',
      errorCode.connect
    );
  }
  let src = localSrc;
  if (typeof src === 'string') {
    src = fs.realpathSync(src);
    fs.accessSync(src, fs.constants.R_OK);
  }
  let dst = remotePath;
  if (dst.startsWith('..')) {
    let root = await this.realPath('..');
    dst = root + this.remotePathSep + dst.substring(3);
  } else if (dst.startsWith('.')) {
    let root = await this.realPath('.');
    dst = root + this.remotePathSep + dst.substring(2);
  }
  return this._put(src, dst, options);
};

SftpClient.prototype._append = function(input, remotePath, options) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = this.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    let writerOptions;

    if (options) {
      writerOptions = options;
      writerOptions.flags = 'a';
    } else {
      writerOptions = {
        flags: 'a'
      };
    }

    let stream = sftp.createWriteStream(remotePath, writerOptions);

    stream.on('error', err => {
      utils.removeListeners(stream);
      reject(
        utils.formatError(
          `${err.message} ${remotePath}`,
          'sftp.append',
          err.code
        )
      );
      self.removeListener('error', errorListener);
    });

    stream.on('finish', () => {
      utils.removeListeners(stream);
      resolve(`sftp.append: Uploaded data stream to ${remotePath}`);
      self.removeListener('error', errorListener);
    });

    if (input instanceof Buffer) {
      stream.end(input);
    } else {
      input.pipe(stream);
    }
  });
};

/**
 * Append to an existing remote file
 *
 * @param  {Buffer|stream} input
 * @param  {String} remotePath,
 * @param  {Object} options
 * @return {Promise}
 */
SftpClient.prototype.append = async function(input, remotePath, options) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.append',
      errorCode.connect
    );
  }
  if (typeof input === 'string') {
    throw utils.formatError(
      'Cannot append one file to another',
      'sftp.append',
      errorCode.badPath
    );
  }
  let absPath = await this.realPath(remotePath);
  let stats = await this.stat(absPath);
  if ((stats.mode & 0o0100000) === 0) {
    throw utils.formatError(
      `${remotePath} Remote path must be a regular file`,
      'sftp-append',
      errorCode.badPath
    );
  }
  if ((stats.mode & 0o0444) === 0) {
    throw utils.formatError(
      `${remotePath} No write permission`,
      'sftp-append',
      errorCode.permission
    );
  }
  return this._append(input, absPath, options);
};

/**
 * @async
 *
 * Make a directory on remote server
 *
 * @param {string} path, remote directory path.
 * @param {boolean} recursive, if true, recursively create directories
 * @return {Promise}.
 */
SftpClient.prototype.mkdir = async function(path, recursive = false) {
  const self = this;
  const sftp = self.sftp;
  let errorListener;

  function doMkdir(p) {
    return new Promise((resolve, reject) => {
      errorListener = utils.makeErrorListener(reject);
      self.on('error', errorListener);

      sftp.mkdir(p, err => {
        if (err) {
          reject(
            utils.formatError(`${err.message} ${p}`, 'sftp.mkdir', err.code)
          );
        }
        resolve(`${p} directory created`);
        self.removeListener('error', errorListener);
      });
    });
  }

  try {
    if (!sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'sftp.mkdir',
        errorCode.connect
      );
    }
    let realPath = path;
    if (realPath.startsWith('..')) {
      let root = await this.realPath('..');
      realPath = root + this.remotePathSep + realPath.substring(3);
    } else if (realPath.startsWith('.')) {
      let root = await this.realPath('.');
      realPath = root + this.remotePathSep + realPath.substring(2);
    }

    if (!recursive) {
      return doMkdir(realPath);
    }
    let {dir} = posix.parse(realPath);
    let parent = await this.exists(dir);
    if (!parent) {
      await this.mkdir(dir, true);
    } else if (parent !== 'd') {
      throw utils.formatError(
        'Bad directory path',
        'sftp.mkdir',
        errorCode.badPath
      );
    }
    return doMkdir(realPath);
  } catch (err) {
    throw utils.formatError(err, 'sftp.mkdir', err.code);
  }
};

/**
 * @async
 *
 * Remove directory on remote server
 *
 * @param {string} path, path to directory to be removed
 * @param {boolean} recursive, if true, remove directories/files in target
 *                             directory
 * @return {Promise}..
 */
SftpClient.prototype.rmdir = async function(path, recursive = false) {
  const self = this;
  const sftp = self.sftp;
  let errorListener;

  function doRmdir(p) {
    return new Promise((resolve, reject) => {
      errorListener = utils.makeErrorListener(reject);
      self.on('error', errorListener);

      try {
        sftp.rmdir(p, err => {
          if (err) {
            reject(
              utils.formatError(`${err.message} ${p}`, 'sftp.rmdir', err.code)
            );
          }
          resolve('Successfully removed directory');
          self.removeListener('error', errorListener);
        });
      } catch (err) {
        reject(utils.formatError(err, 'sftp.rmdir', err.code));
        self.removeListener('error', errorListener);
      }
    });
  }

  try {
    if (!sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'sftp.rmdir',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(path);
    if (!recursive) {
      return doRmdir(absPath);
    }
    let list = await this.list(absPath);
    if (list.length) {
      let files = list.filter(item => item.type !== 'd');
      let dirs = list.filter(item => item.type === 'd');
      for (let f of files) {
        try {
          await this.delete(absPath + this.remotePathSep + f.name);
        } catch (err) {
          throw utils.formatError(err, 'sftp.rmdir', err.code);
        }
      }
      for (let d of dirs) {
        try {
          await this.rmdir(absPath + this.remotePathSep + d.name, true);
        } catch (err) {
          throw utils.formatError(err, 'sftp.rmdir', err.code);
        }
      }
    }
    return doRmdir(absPath);
  } catch (err) {
    throw utils.formatError(err, 'sftp.rmdir', err.code);
  }
};

SftpClient.prototype._delete = function(path) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    let sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.unlink(path, err => {
      if (err) {
        reject(
          utils.formatError(`${err.message} ${path}`, 'sftp.delete', err.code)
        );
      }
      resolve('Successfully deleted file');
      self.removeListener('error', errorListener);
    });
  });
};

/**
 * @async
 *
 * Delete a file on the remote SFTP server
 *
 * @param {string} path - path to the file to delete
 * @return {Promise} with string 'Successfully deleeted file' once resolved
 *
 */
SftpClient.prototype.delete = async function(path) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.delete',
      errorCode.connect
    );
  }
  let absPath = await this.realPath(path);
  return this._delete(absPath);
};

SftpClient.prototype._rename = function(fromPath, toPath) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    let sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.rename(fromPath, toPath, err => {
      if (err) {
        reject(
          utils.formatError(
            `${err.message} From: ${fromPath} To: ${toPath}`,
            'sftp.rename',
            err.code
          )
        );
      }
      resolve(`Successfully renamed ${fromPath} to ${toPath}`);
      self.removeListener('error', errorListener);
    });
  });
};

/**
 * @async
 *
 * Rename a file on the remote SFTP repository
 *
 * @param {string} fromPath - path to the file to be renamced.
 * @param {string} toPath - path to the new name.
 *
 * @return {Promise}
 *
 */
SftpClient.prototype.rename = async function(fromPath, toPath) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.rename',
      errorCode.connect
    );
  }
  let src = await this.realPath(fromPath);
  let dst = toPath;
  if (dst.startsWith('..')) {
    let root = await this.realPath('..');
    dst = root + this.remotePathSep + dst.substring(3);
  } else if (dst.startsWith('.')) {
    let root = await this.realPath('.');
    dst = root + this.remotePathSep + dst.substring(2);
  }
  return this._rename(src, dst);
};

SftpClient.prototype._chmod = function(remotePath, mode) {
  const self = this;
  let errorListener;

  return new Promise((resolve, reject) => {
    const sftp = self.sftp;

    errorListener = utils.makeErrorListener(reject);
    self.on('error', errorListener);

    sftp.chmod(remotePath, mode, err => {
      if (err) {
        reject(
          utils.formatError(
            `${err.message} ${remotePath}`,
            'sftp.chmod',
            err.code
          )
        );
      }
      resolve('Successfully change file mode');
      self.removeListener('error', errorListener);
    });
  });
};

/**
 * @async
 *
 * Change the mode of a remote file on the SFTP repository
 *
 * @param {string} remotePath - path to the remote target object.
 * @param {Octal} mode - the new mode to set
 *
 * @return {Promise}.
 */
SftpClient.prototype.chmod = async function(remotePath, mode) {
  if (!this.sftp) {
    throw utils.formatError(
      'No SFTP connection available',
      'sftp.chmod',
      errorCode.connect
    );
  }
  let path = await this.realPath(remotePath);
  return this._chmod(path, mode);
};

/**
 * @async
 *
 * Create a new SFTP connection to a remote SFTP server
 *
 * @param {Object} config - an SFTP configuration object
 * @param {string} connectMethod - ???
 *
 * @return {Promise} which will resolve to an sftp client object
 *
 */
SftpClient.prototype.connect = function(config) {
  let self = this;
  var operation = retry.operation({
    retries: config.retries || 1,
    factor: config.retry_factor || 2,
    minTimeout: config.retry_minTimeout || 1000
  });

  function retryConnect(config, callback) {
    try {
      operation.attempt(function(attemptCount) {
        self.client
          .on('ready', () => {
            self.client.sftp((err, sftp) => {
              if (err) {
                utils.removeListeners(self.client);
                if (operation.retry(err)) {
                  // failed to connect, but not yet reached max attempt count
                  // remove the listeners and try again
                  return;
                }
                // exhausted retries - do callback with error
                callback(
                  utils.formatError(
                    err,
                    'sftp.connect',
                    err.code,
                    attemptCount
                  ),
                  null
                );
              }
              self.sftp = sftp;
              // remove retry error listener and add generic error listener
              self.client.removeAllListeners('error');
              self.client.removeAllListeners('end');
              self.client.on('close', utils.makeCloseListener(self));
              callback(null, sftp);
            });
          })
          .on('error', err => {
            utils.removeListeners(self.client);
            if (operation.retry(err)) {
              // failed to connect, but not yet reached max attempt count
              // remove the listeners and try again
              return;
            }
            // exhausted retries - do callback with error
            callback(
              utils.formatError(err, 'sftp.connect', err.code, attemptCount),
              null
            );
          })
          .on('end', () => {
            callback(
              utils.formatError(
                'Connection ended unexpectedly by remote server',
                self.clientName,
                errorCode.connect
              )
            );
          })
          .connect(config);
      });
    } catch (err) {
      utils.removeListeners(self.client);
      callback(utils.formatError(err, 'sftp.connect', err.code), null);
    }
  }

  return new Promise((resolve, reject) => {
    if (self.sftp) {
      reject(
        utils.formatError(
          'An existing SFTP connection is already defined',
          'sftp.connect',
          errorCode.connect
        )
      );
    } else {
      retryConnect(config, (err, sftp) => {
        if (err) {
          reject(err);
        } else {
          sftp.realpath('.', (err, absPath) => {
            if (err) {
              reject(
                utils.formatError(
                  `Failed to determine remote server type: ${err.message}`,
                  'sftp.connect',
                  err.code
                )
              );
            } else {
              if (absPath.startsWith('/')) {
                self.remotePathSep = '/';
                self.remotePlatform = 'unix';
              } else {
                self.remotePathSep = '\\';
                self.remotePlatform = 'windows';
              }
              resolve(sftp);
            }
          });
        }
      });
    }
  });
};

// function debugListeners(emitter) {
//   let eventNames = emitter.eventNames();
//   if (eventNames.length) {
//     console.log('Listener Data');
//     eventNames.map(n => {
//       console.log(`${n}: ${emitter.listenerCount(n)}`);
//     });
//   }
// }

/**
 * @async
 *
 * End the SFTP connection
 *
 */
SftpClient.prototype.end = function() {
  let self = this;

  return new Promise((resolve, reject) => {
    try {
      self.endCalled = true;
      self.client.on('close', () => {
        utils.removeListeners(self.client);
        resolve(true);
        self.sftp = undefined;
        self.endCalled = false;
      });
      self.client.end();
    } catch (err) {
      reject(utils.formatError(err, 'sftp.end', err.code));
    }
  });
};

/**
 * Add a listner to the client object. This is rarely necessary and can be
 * the source of errors. It is the client's responsibility to remove the
 * listeners when no longer required. Failure to do so can result in memory
 * leaks.
 *
 * @param {string} eventType - one of the supported event types
 * @param {function} callback - function called when event triggers
 */
SftpClient.prototype.on = function(eventType, callback) {
  this.client.on(eventType, callback);
};

SftpClient.prototype.removeListener = function(eventType, listener) {
  this.client.removeListener(eventType, listener);
};

module.exports = SftpClient;
