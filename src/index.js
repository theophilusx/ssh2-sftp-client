/**
 * ssh2 sftp client for node
 */

'use strict';

const Client = require('ssh2').Client;
const fs = require('fs');
const concat = require('concat-stream');
const retry = require('retry');
const {join, posix, normalize} = require('path');
const utils = require('./utils');

const errorCode = {
  generic: 'ERR_GENERIC_CLIENT',
  connect: 'ERR_NOT_CONNECTED',
  badPath: 'ERR_BAD_PATH',
  permission: 'ERR_NO_PERMISSON'
};

class SftpClient {
  constructor(clientName) {
    this.client = new Client();
    this.sftp = undefined;
    this.clientName = clientName ? clientName : 'sftp';
    this.endCalled = false;
    this.remotePathSep = '/';
    this.remotePlatform = 'unix';
    this.errorHandled = false;
  }

  /**
   * Add a listner to the client object. This is rarely necessary and can be
   * the source of errors. It is the client's responsibility to remove the
   * listeners when no longer required. Failure to do so can result in memory
   * leaks.
   *
   * @param {string} eventType - one of the supported event types
   * @param {function} callback - function called when event triggers
   */
  on(eventType, callback) {
    this.client.on(eventType, callback);
  }

  removeListener(eventType, callback) {
    this.client.removeListener(eventType, callback);
  }

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
  connect(config) {
    let operation = retry.operation({
      retries: config.retries || 1,
      factor: config.retry_factor || 2,
      minTimeout: config.retry_minTimeout || 1000
    });

    const retryConnect = (config, callback) => {
      try {
        operation.attempt(attemptCount => {
          const connectErrorListener = err => {
            this.removeListener('error', connectErrorListener);
            if (operation.retry(err)) {
              // failed to connect, but not yet reached max attempt count
              // remove the listeners and try again
              return;
            }
            // exhausted retries - do callback with error
            callback(
              utils.formatError(err, 'connect', err.code, attemptCount),
              null
            );
          };

          this.client
            .on('ready', () => {
              this.client.sftp((err, sftp) => {
                if (err) {
                  this.client.removeListener('error', connectErrorListener);
                  if (operation.retry(err)) {
                    // failed to connect, but not yet reached max attempt count
                    // remove the listeners and try again
                    return;
                  }
                  // exhausted retries - do callback with error
                  callback(
                    utils.formatError(err, 'connect', err.code, attemptCount),
                    null
                  );
                }
                this.sftp = sftp;
                // remove retry error listener and add generic error listener
                this.client.removeListener('error', connectErrorListener);
                this.client.on('close', utils.makeCloseListener(this));
                this.client.on('error', err => {
                  if (!this.errorHandled) {
                    // error not already handled. Log it.
                    console.error(`Error event: ${err.message}`);
                  }
                  //need to set to false in case another error raised
                  this.errorHandled = false;
                });
                callback(null, sftp);
              });
            })
            .on('error', connectErrorListener)
            .connect(config);
        });
      } catch (err) {
        utils.removeListeners(this.client);
        callback(utils.formatError(err, 'connect'), null);
      }
    };

    return new Promise((resolve, reject) => {
      if (this.sftp) {
        reject(
          utils.formatError(
            'An existing SFTP connection is already defined',
            'connect',
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
                    'connect',
                    errorCode.generic
                  )
                );
              } else {
                if (absPath.startsWith('/')) {
                  this.remotePathSep = '/';
                  this.remotePlatform = 'unix';
                } else {
                  this.remotePathSep = '\\';
                  this.remotePlatform = 'windows';
                }
                resolve(sftp);
              }
            });
          }
        });
      }
    });
  }

  /**
   * @async
   *
   * Returns the real absolute path on the remote server. Is able to handle
   * both '.' and '..' in path names, but not '~'. If the path is relative
   * then the current working directory is prepended to create an absolute path.
   * Returns undefined if the
   * path does not exists.
   *
   * @param {String} remotePath - remote path, may be relative
   * @returns {}
   */
  realPath(remotePath) {
    return new Promise((resolve, reject) => {
      let errorListener;

      try {
        if (!this.sftp) {
          reject(
            utils.formatError(
              'No SFTP connection available',
              'realPath',
              errorCode.connect
            )
          );
        } else {
          errorListener = utils.makeErrorListener(reject, this);
          this.client.prependListener('error', errorListener);
          this.sftp.realpath(remotePath, (err, absPath) => {
            if (err) {
              if (err.code === 2) {
                resolve(undefined);
              } else {
                reject(
                  utils.formatError(
                    `${err.message} ${remotePath}`,
                    'realPath',
                    err.code
                  )
                );
              }
            }
            resolve(absPath);
          });
        }
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(
            utils.formatError(
              `${err.message} ${remotePath}`,
              'realPath',
              err.code
            )
          );
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  cwd() {
    return this.realPath('.');
  }

  /**
   * @async
   *
   * List contents of a remote directory. If a pattern is provided,
   * filter the results to only include files with names that match
   * the supplied pattern. Return value is an array of file entry
   * objects that include properties for type, name, size, modifiyTime,
   * accessTime, rights {user, group other}, owner and group.
   *
   * @param {String} remotePath - path to remote directory
   * @param {RegExp} pattern - regular expression to match filenames
   * @returns {Array} file description objects
   * @throws {Error}
   */
  async list(remotePath, pattern = /.*/) {
    const reg = /-/gi;

    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'list',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(remotePath);
    if (!absPath) {
      throw utils.formatError(
        `No such directory: ${remotePath}`,
        'list',
        errorCode.badPath
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.readdir(absPath, (err, fileList) => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${remotePath}`,
                'list',
                err.code
              )
            );
          } else {
            let newList = [];
            // reset file info
            if (fileList) {
              newList = fileList.map(item => {
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
          }
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'list'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  /**
   * @async
   *
   * Tests to see if an object exists. If it does, return the type of that object
   * (in the format returned by list). If it does not exist, return false.
   *
   * @param {string} path - path to the object on the sftp server.
   *
   * @return {boolean} returns false if object does not exist. Returns type of
   *                   object if it does
   */
  async exists(remotePath) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connections available',
        'exists',
        errorCode.connect
      );
    } else if (remotePath === '.') {
      return 'd';
    } else {
      let absPath = await this.realPath(remotePath);
      if (!absPath) {
        return false;
      } else {
        return new Promise((resolve, reject) => {
          let errorListener;
          try {
            errorListener = utils.makeErrorListener(reject, this);
            this.client.prependListener('error', errorListener);
            let {dir, base} = posix.parse(absPath);
            if (!base) {
              // at root
              resolve('d');
            } else {
              this.sftp.readdir(dir, (err, list) => {
                if (err) {
                  if (err.code === 2) {
                    resolve(false);
                  } else {
                    reject(utils.formatError(err, 'exists'));
                  }
                } else {
                  let [type] = list
                    .filter(i => i.filename === base)
                    .map(f => f.longname.substr(0, 1));
                  if (type) {
                    resolve(type);
                  }
                  resolve(false);
                }
              });
            }
          } catch (err) {
            reject(utils.formatError(err, 'exists'));
          } finally {
            this.removeListener('error', errorListener);
          }
        });
      }
    }
  }

  /**
   * Retrieves attributes for path
   *
   * @param {String} path, a string containing the path to a file
   * @return {Promise} stats, attributes info
   */
  async stat(remotePath) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'stat',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(remotePath);
    if (!absPath) {
      throw utils.formatError(
        `No such file: ${remotePath}`,
        'stat',
        errorCode.badPath
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.stat(absPath, (err, stats) => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${remotePath}`,
                'stat',
                err.code
              )
            );
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
          }
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'stat'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

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
  async get(remotePath, dst, options) {
    const _get = (sftpPath, localDst, options) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this);
          this.client.prependListener('error', errorListener);
          let rdr = this.sftp.createReadStream(sftpPath, options);
          rdr.on('error', err => {
            utils.removeListeners(rdr);
            reject(
              utils.formatError(`${err.message} ${sftpPath}`, 'get', err.code)
            );
          });
          if (localDst === undefined) {
            // no dst specified, return buffer of data
            let concatStream = concat(buff => {
              rdr.removeAllListeners('error');
              resolve(buff);
            });
            rdr.pipe(concatStream);
          } else {
            let wtr;
            if (typeof localDst === 'string') {
              // dst local file path
              wtr = fs.createWriteStream(localDst);
            } else {
              // assume dst is a writeable
              wtr = localDst;
            }
            wtr.on('error', err => {
              utils.removeListeners(rdr);
              reject(
                utils.formatError(
                  `${err.message} ${typeof dst === 'string' ? localDst : ''}`,
                  'get',
                  err.code
                )
              );
            });
            wtr.on('finish', () => {
              utils.removeListeners(rdr);
              if (typeof localDst === 'string') {
                resolve(localDst);
              } else {
                resolve(wtr);
              }
            });
            rdr.pipe(wtr);
          }
        } catch (err) {
          reject(utils.formatError(err, 'get'));
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'get',
        errorCode.connect
      );
    }
    let remoteExists = await this.exists(remotePath);
    if (!remoteExists) {
      throw utils.formatError(
        `No such file: ${remotePath}`,
        'get',
        errorCode.badpath
      );
    }
    if (remoteExists === 'd') {
      throw utils.formatError(
        `Bad path: ${remotePath} must be a file`,
        'get',
        errorCode.badPath
      );
    }
    if (typeof dst === 'string') {
      dst = normalize(dst);
    }
    return _get(remotePath, dst, options);
  }

  /**
   * Use SSH2 fastGet for downloading the file.
   * Downloads a file at remotePath to localPath using parallel reads
   * for faster throughput.
   *
   * See 'fastGet' at
   * https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
   *
   * @param {String} remotePath
   * @param {String} localPath
   * @param {Object} options
   * @return {Promise} the result of downloading the file
   */
  async fastGet(remotePath, localPath, options) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'fastGet',
        errorCode.connect
      );
    }
    let remoteExists = await this.exists(remotePath);
    if (!remoteExists) {
      throw utils.formatError(
        `No such file: ${remotePath}`,
        'fastGet',
        errorCode.badPath
      );
    }
    if (remoteExists === 'd') {
      throw utils.formatError(
        `Bad path: ${remotePath} must be a file`,
        'fastGet',
        errorCode.badPath
      );
    }
    let dst = normalize(localPath);
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.fastGet(remotePath, dst, options, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} src: ${remotePath} dst: ${dst}`,
                'fastGet',
                err.code
              )
            );
          }
          resolve(`${remotePath} was successfully download to ${localPath}!`);
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'fastGet'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

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
  async fastPut(localPath, remotePath, options) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'fastPut',
        errorCode.connect
      );
    }
    let [readable, errCode] = await utils.localAccess(
      localPath,
      fs.constants.R_OK
    );
    if (!readable) {
      let msg = '';
      if (errCode === 'ENOENT') {
        msg = `No such file: ${localPath}`;
      } else {
        msg = `Permission denied: ${localPath}`;
      }
      throw utils.formatError(msg, 'fastPut', errCode);
    }
    let dst = remotePath;
    if (dst.startsWith('..')) {
      let root = await this.realPath('..');
      dst = root + this.remotePathSep + dst.substring(3);
    } else if (dst.startsWith('.')) {
      let root = await this.realPath('.');
      dst = root + this.remotePathSep + dst.substring(2);
    }
    let {dir} = posix.parse(dst);
    let dirExists = await this.exists(dir);
    if (!dirExists) {
      throw utils.formatError(
        `No such directory: ${dir}`,
        'fastPut',
        errorCode.badPath
      );
    }
    if (dirExists === '-') {
      throw utils.formatError(
        `Bad path: ${dir} must be a directory`,
        'fastPut',
        errorCode.badPath
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.fastPut(localPath, dst, options, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} Local: ${localPath} Remote: ${dst}`,
                'fastPut',
                err.code
              )
            );
          }
          resolve(`${localPath} was successfully uploaded to ${remotePath}!`);
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'fastPut'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

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
  async put(localSrc, remotePath, options) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connections available',
        'put',
        errorCode.connect
      );
    }
    if (typeof localSrc === 'string') {
      let [readable, errCode] = await utils.localAccess(
        localSrc,
        fs.constants.R_OK
      );
      if (!readable) {
        let msg = '';
        if (errCode === 'ENOENT') {
          msg = `No such file: ${localSrc}`;
        } else {
          msg = `Permission denied: ${localSrc}`;
        }
        throw utils.formatError(msg, 'put', errCode);
      }
    }
    let dst = remotePath;
    if (dst.startsWith('..')) {
      let root = await this.realPath('..');
      dst = root + this.remotePathSep + dst.substring(3);
    } else if (dst.startsWith('.')) {
      let root = await this.realPath('.');
      dst = root + this.remotePathSep + dst.substring(2);
    }
    let {dir} = posix.parse(dst);
    let dirExists = await this.exists(dir);
    if (!dirExists) {
      throw utils.formatError(
        `No such directory: ${dir}`,
        'put',
        errorCode.badPath
      );
    }
    if (dirExists === '-') {
      throw utils.formatError(
        `Bad path: ${dir} must be a directory`,
        'put',
        errorCode.badPath
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        let stream = this.sftp.createWriteStream(dst, options);
        stream.on('error', err => {
          reject(utils.formatError(`${err.message} ${dst}`, 'put', err.code));
        });
        stream.on('finish', () => {
          utils.removeListeners(stream);
          resolve(`Uploaded data stream to ${dst}`);
        });
        if (localSrc instanceof Buffer) {
          stream.end(localSrc);
        } else {
          let rdr;
          if (typeof localSrc === 'string') {
            rdr = fs.createReadStream(localSrc);
          } else {
            rdr = localSrc;
          }
          rdr.on('error', err => {
            utils.removeListeners(stream);
            reject(
              utils.formatError(
                `${err.message} ${
                  typeof localSrc === 'string' ? localSrc : ''
                }`,
                'put',
                err.code
              )
            );
          });
          rdr.pipe(stream);
        }
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'put'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  /**
   * Append to an existing remote file
   *
   * @param  {Buffer|stream} input
   * @param  {String} remotePath,
   * @param  {Object} options
   * @return {Promise}
   */
  async append(input, remotePath, options) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'append',
        errorCode.connect
      );
    }
    if (typeof input === 'string') {
      throw utils.formatError(
        'Cannot append one file to another',
        'append',
        errorCode.badPath
      );
    }
    let absPath = await this.realPath(remotePath);
    if (!absPath) {
      throw utils.formatError(
        `No such file: ${remotePath}`,
        'append',
        errorCode.badpath
      );
    }
    let stats = await this.stat(absPath);
    if ((stats.mode & 0o0100000) === 0) {
      throw utils.formatError(
        `${remotePath} Remote path must be a regular file`,
        'append',
        errorCode.badPath
      );
    }
    if ((stats.mode & 0o0444) === 0) {
      throw utils.formatError(
        `${remotePath} No write permission`,
        'append',
        errorCode.permission
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        let writerOptions;
        if (options) {
          writerOptions = options;
          writerOptions.flags = 'a';
        } else {
          writerOptions = {
            flags: 'a'
          };
        }
        let stream = this.sftp.createWriteStream(remotePath, writerOptions);
        stream.on('error', err => {
          utils.removeListeners(stream);
          reject(
            utils.formatError(
              `${err.message} ${remotePath}`,
              'append',
              err.code
            )
          );
        });
        stream.on('finish', () => {
          utils.removeListeners(stream);
          resolve(`sftp.append: Uploaded data stream to ${remotePath}`);
        });
        if (input instanceof Buffer) {
          stream.end(input);
        } else {
          input.pipe(stream);
        }
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(err, 'put');
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  /**
   * @async
   *
   * Make a directory on remote server
   *
   * @param {string} path, remote directory path.
   * @param {boolean} recursive, if true, recursively create directories
   * @return {Promise}.
   */
  async mkdir(path, recursive = false) {
    const doMkdir = p => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this);
          this.client.prependListener('error', errorListener);
          this.sftp.mkdir(p, err => {
            if (err) {
              reject(
                utils.formatError(`${err.message} ${p}`, 'mkdir', err.code)
              );
            }
            resolve(`${p} directory created`);
          });
        } catch (err) {
          reject(utils.formatError(err, 'mkdir'));
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      if (!this.sftp) {
        throw utils.formatError(
          'No SFTP connection available',
          'mkdir',
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
          'mkdir',
          errorCode.badPath
        );
      }
      return doMkdir(realPath);
    } catch (err) {
      if (err.custom) {
        throw err;
      } else {
        throw utils.formatError(err, 'mkdir');
      }
    }
  }

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
  async rmdir(remotePath, recursive = false) {
    const doRmdir = p => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this);
          this.client.prependListener('error', errorListener);
          this.sftp.rmdir(p, err => {
            if (err) {
              reject(
                utils.formatError(`${err.message} ${p}`, 'rmdir', err.code)
              );
            }
            resolve('Successfully removed directory');
          });
        } catch (err) {
          if (err.custom) {
            reject(err);
          } else {
            reject(utils.formatError(err, 'rmdir', err.code));
          }
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      if (!this.sftp) {
        throw utils.formatError(
          'No SFTP connection available',
          'rmdir',
          errorCode.connect
        );
      }
      let absPath = await this.realPath(remotePath);
      if (!absPath) {
        throw utils.formatError(
          `No such directory: ${remotePath}`,
          'rmdir',
          errorCode.badpath
        );
      }
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
            throw utils.formatError(err, 'rmdir');
          }
        }
        for (let d of dirs) {
          try {
            await this.rmdir(absPath + this.remotePathSep + d.name, true);
          } catch (err) {
            throw utils.formatError(err, 'rmdir');
          }
        }
      }
      return doRmdir(absPath);
    } catch (err) {
      if (err.custom) {
        throw err;
      } else {
        throw utils.formatError(err, 'rmdir');
      }
    }
  }

  /**
   * @async
   *
   * Delete a file on the remote SFTP server
   *
   * @param {string} path - path to the file to delete
   * @return {Promise} with string 'Successfully deleeted file' once resolved
   *
   */
  async delete(remotePath) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'delete',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(remotePath);
    if (!absPath) {
      throw utils.formatError(
        `No such file: ${remotePath}`,
        'delete',
        errorCode.badPath
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.unlink(absPath, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${remotePath}`,
                'delete',
                err.code
              )
            );
          }
          resolve('Successfully deleted file');
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'delete'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

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
  async rename(fromPath, toPath) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'rename',
        errorCode.connect
      );
    }
    let src = await this.realPath(fromPath);
    if (!src) {
      throw utils.formatError(
        `No such file: ${fromPath}`,
        'rename',
        errorCode.badPath
      );
    }
    let dst = toPath;
    if (dst.startsWith('..')) {
      let root = await this.realPath('..');
      dst = root + this.remotePathSep + dst.substring(3);
    } else if (dst.startsWith('.')) {
      let root = await this.realPath('.');
      dst = root + this.remotePathSep + dst.substring(2);
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.rename(src, dst, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} From: ${src} To: ${dst}`,
                'rename',
                err.code
              )
            );
          }
          resolve(`Successfully renamed ${fromPath} to ${toPath}`);
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'rename'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

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
  async chmod(remotePath, mode) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'chmod',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(remotePath);
    if (!absPath) {
      throw utils.formatError(
        `No such file: ${remotePath}`,
        'chmod',
        errorCode.badPath
      );
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.chmod(absPath, mode, err => {
          if (err) {
            reject(
              utils.formatError(`${err.message} ${absPath}`, 'chmod', err.code)
            );
          }
          resolve('Successfully change file mode');
        });
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'chmod'));
        }
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  /**
   * @async
   *
   * Upload the specified source directory to the specified destination
   * directory. All regular files and sub-directories are uploaded to the remote
   * server.
   * @param {String} srcDir - local source directory
   * @param {String} dstDir - remote destination directory
   * @returns {String}
   * @throws {Error}
   */
  async uploadDir(srcDir, dstDir) {
    try {
      if (!this.sftp) {
        throw utils.formatError(
          'No SFTP connection available',
          'uploadDir',
          errorCode.connect
        );
      }
      let dirExists = await this.exists(dstDir);
      if (!dirExists) {
        await this.mkdir(dstDir, true);
      } else if (dirExists === '-') {
        throw utils.formatError(
          `Remote path is not a directory: ${dstDir}`,
          'uploadDir',
          errorCode.badpath
        );
      }
      let dirEntries = fs.readdirSync(normalize(srcDir), {
        encoding: 'utf8',
        withFileTypes: true
      });
      for (let e of dirEntries) {
        if (e.isDirectory()) {
          let newSrc = join(srcDir, e.name);
          let newDst = dstDir + this.remotePathSep + e.name;
          await this.uploadDir(newSrc, newDst);
        } else if (e.isFile()) {
          await this.fastPut(
            join(srcDir, e.name),
            dstDir + this.remotePathSep + e.name
          );
        } else {
          console.log(`uploadDir: File ignored: ${e.name} not a regular file`);
        }
      }
      return `${srcDir} uploaded to ${dstDir}`;
    } catch (err) {
      if (err.custom) {
        throw err;
      } else {
        throw utils.formatError(
          `${err.message} src: ${srcDir} dst: ${dstDir}`,
          'uploadDir'
        );
      }
    }
  }

  /**
   * @async
   *
   * End the SFTP connection
   *
   */
  end() {
    return new Promise((resolve, reject) => {
      try {
        this.client.prependListener('error', err => {
          // we don't care about errors at this point
          // so do nothiing
          this.errorHandled = true;
          if (err.code !== 'ECONNRESET') {
            console.log(`end(): Ignoring unexpected error ${err.message}`);
          }
        });
        this.endCalled = true;
        this.client.on('close', () => {
          resolve(true);
          utils.removeListeners(this.client);
          this.sftp = undefined;
          this.endCalled = false;
        });
        this.client.end();
      } catch (err) {
        if (err.custom) {
          reject(err);
        } else {
          reject(utils.formatError(err, 'end'));
        }
      }
    });
  }
}

module.exports = SftpClient;
