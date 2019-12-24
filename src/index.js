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

class SftpClient {
  constructor(clientName) {
    this.client = new Client();
    this.sftp = undefined;
    this.clientName = clientName ? clientName : 'sftp';
    this.endCalled = false;
    this.remotePath = '/';
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
        callback(utils.formatError(err, 'connect', err.code), null);
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
                    err.code
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
              reject(
                utils.formatError(
                  `${err.message} ${remotePath}`,
                  'realPath',
                  err.code
                )
              );
              this.removeListener('error', errorListener);
            }
            resolve(absPath);
          });
        }
      } catch (err) {
        reject(
          utils.formatError(
            `${err.message} ${remotePath}`,
            'realPath',
            err.code
          )
        );
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  cwd() {
    return this.realPath('.');
  }

  _list(remotePath, pattern = /.*/) {
    const reg = /-/gi;

    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.readdir(remotePath, (err, list) => {
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
          }
        });
      } catch (err) {
        reject(utils.formatError(err, 'list', err.code));
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  /**
   * Retrieves a directory listing. The pattern argument may be a regular expression
   * or simple 'glob' style *.
   *
   * @param {String} path, a string containing the path to a directory
   * @param {regex} pattern - An optional pattern used to filter the list
   * @return {Promise} data, list info
   */
  async list(remotePath, pattern = /.*/) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'list',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(remotePath);
    return this._list(absPath, pattern);
  }

  _exists(remotePath) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        let {dir, base} = posix.parse(remotePath);
        if (!base) {
          // at root
          resolve('d');
        } else {
          this.sftp.readdir(dir, (err, list) => {
            if (err) {
              if (err.code === 2) {
                resolve(false);
              } else {
                reject(utils.formatError(err, 'sftp.exists'));
              }
            } else {
              let [type] = list
                .filter(item => item.filename === base)
                .map(item => item.longname.substr(0, 1));
              if (type) {
                resolve(type);
              } else {
                resolve(false);
              }
            }
          });
        }
      } catch (err) {
        reject(utils.formatError(err, 'list', err.code));
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
    try {
      if (!this.sftp) {
        throw utils.formatError(
          'No SFTP connection available',
          'exists',
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
  }

  _stat(remotePath) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.stat(remotePath, (err, stats) => {
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
        reject(err, 'stat', err.code);
      } finally {
        this.removeListener('error', errorListener);
      }
    });
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
    return this._stat(absPath);
  }

  _get(path, dst, options) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        let rdr = this.sftp.createReadStream(path, options);
        rdr.on('error', err => {
          utils.removeListeners(rdr);
          reject(
            utils.formatError(`${err.message} ${path}`, 'sftp.get', err.code)
          );
        });
        if (dst === undefined) {
          // no dst specified, return buffer of data
          let concatStream = concat(buff => {
            rdr.removeAllListeners('error');
            resolve(buff);
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
                'get',
                err.code
              )
            );
          });
          wtr.on('finish', () => {
            utils.removeListeners(rdr);
            if (typeof dst === 'string') {
              resolve(dst);
            } else {
              resolve(wtr);
            }
          });
          rdr.pipe(wtr);
        }
      } catch (err) {
        reject(utils.formatError(err, 'get', err.code));
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
  async get(path, dst, options) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'get',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(path);
    let stats = await this.stat(absPath);
    if ((stats.mode & 0o444) === 0) {
      throw utils.formatError(
        `No read permission for ${absPath}`,
        'get',
        errorCode.permission
      );
    }
    if (typeof dst === 'string') {
      let dstPath = normalize(dst);
      return this._get(absPath, dstPath, options);
    }
    return this._get(absPath, dst, options);
  }

  _fastGet(remotePath, localPath, options) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.fastGet(remotePath, localPath, options, err => {
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
        });
      } catch (err) {
        reject(utils.formatError(err, 'fastGet', err.code));
      } finally {
        this.removeListener('error', errorListener);
      }
    });
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
    let src = await this.realPath(remotePath);
    let dst = normalize(localPath);
    return this._fastGet(src, dst, options);
  }

  _fastPut(localPath, remotePath, options) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.fastPut(localPath, remotePath, options, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} Local: ${localPath} Remote: ${remotePath}`,
                'fastPut',
                err.code
              )
            );
          }
          resolve(`${localPath} was successfully uploaded to ${remotePath}!`);
        });
      } catch (err) {
        reject(utils.formatError(err, 'fastPut', err.code));
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
  }

  _put(src, remotePath, options) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        let stream = this.sftp.createWriteStream(remotePath, options);
        stream.on('error', err => {
          reject(
            utils.formatError(`${err.message} ${remotePath}`, 'put', err.code)
          );
        });
        stream.on('finish', () => {
          utils.removeListeners(stream);
          resolve(`Uploaded data stream to ${remotePath}`);
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
                'put',
                err.code
              )
            );
          });
          rdr.pipe(stream);
        }
      } catch (err) {
        reject(utils.formatError(err, 'put'));
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
  }

  _append(input, remotePath, options) {
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
        reject(err, 'put');
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
    return this._append(input, absPath, options);
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
      throw utils.formatError(err, 'sftp.mkdir', err.code);
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
  async rmdir(path, recursive = false) {
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
          reject(utils.formatError(err, 'sftp.rmdir', err.code));
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      if (!this.sftp) {
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
            throw utils.formatError(err, 'rmdir', err.code);
          }
        }
        for (let d of dirs) {
          try {
            await this.rmdir(absPath + this.remotePathSep + d.name, true);
          } catch (err) {
            throw utils.formatError(err, 'rmdir', err.code);
          }
        }
      }
      return doRmdir(absPath);
    } catch (err) {
      throw utils.formatError(err, 'sftp.rmdir', err.code);
    }
  }

  _delete(path) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.unlink(path, err => {
          if (err) {
            reject(
              utils.formatError(`${err.message} ${path}`, 'delete', err.code)
            );
          }
          resolve('Successfully deleted file');
        });
      } catch (err) {
        reject(utils.formatError(err, 'delete'));
      } finally {
        this.removeListener('error', errorListener);
      }
    });
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
  async delete(path) {
    if (!this.sftp) {
      throw utils.formatError(
        'No SFTP connection available',
        'delete',
        errorCode.connect
      );
    }
    let absPath = await this.realPath(path);
    return this._delete(absPath);
  }

  _rename(fromPath, toPath) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.rename(fromPath, toPath, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} From: ${fromPath} To: ${toPath}`,
                'rename',
                err.code
              )
            );
          }
          resolve(`Successfully renamed ${fromPath} to ${toPath}`);
        });
      } catch (err) {
        reject(utils.formatError(err, 'rename'));
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
    let dst = toPath;
    if (dst.startsWith('..')) {
      let root = await this.realPath('..');
      dst = root + this.remotePathSep + dst.substring(3);
    } else if (dst.startsWith('.')) {
      let root = await this.realPath('.');
      dst = root + this.remotePathSep + dst.substring(2);
    }
    return this._rename(src, dst);
  }

  _chmod(remotePath, mode) {
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this);
        this.client.prependListener('error', errorListener);
        this.sftp.chmod(remotePath, mode, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${remotePath}`,
                'chmod',
                err.code
              )
            );
          }
          resolve('Successfully change file mode');
        });
      } catch (err) {
        reject(utils.formatError(err, 'chmod'));
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
    let path = await this.realPath(remotePath);
    return this._chmod(path, mode);
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
        this.endCalled = true;
        this.client.on('close', () => {
          resolve(true);
          utils.removeListeners(this.client);
          this.sftp = undefined;
          this.endCalled = false;
        });
        this.client.end();
      } catch (err) {
        reject(utils.formatError(err, 'sftp.end', err.code));
      }
    });
  }
}

module.exports = SftpClient;
