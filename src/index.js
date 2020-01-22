/**
 * ssh2 sftp client for node
 */

'use strict';

const Client = require('ssh2').Client;
const fs = require('fs');
const concat = require('concat-stream');
const retry = require('retry');
const {join, parse} = require('path');
const utils = require('./utils');
const {errorCode, targetType} = require('./constants');

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
        errorListener = utils.makeErrorListener(reject, this, 'realPath');
        this.client.prependListener('error', errorListener);
        if (utils.haveConnection(this, 'realPath', reject)) {
          this.sftp.realpath(remotePath, (err, absPath) => {
            if (err) {
              if (err.code === 2) {
                resolve('');
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
      } finally {
        this.removeListener('error', errorListener);
      }
    });
  }

  cwd() {
    return this.realPath('.');
  }

  /**
   * Retrieves attributes for path
   *
   * @param {String} path, a string containing the path to a file
   * @return {Promise} stats, attributes info
   */
  async stat(remotePath) {
    const _stat = aPath => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'stat');
          this.client.prependListener('error', errorListener);
          this.sftp.stat(aPath, (err, stats) => {
            if (err) {
              if (err.code === 2) {
                reject(
                  utils.formatError(
                    `No such file: ${remotePath}`,
                    '_stat',
                    errorCode.notexist
                  )
                );
              } else {
                reject(
                  utils.formatError(`${err.message} ${remotePath}`, '_stat')
                );
              }
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
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'stat');
      let absPath = await utils.normalizeRemotePath(this, remotePath);
      return _stat(absPath);
    } catch (err) {
      throw utils.formatError(err, 'stat');
    }
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
      if (utils.haveConnection(this, 'exists')) {
        if (remotePath === '.') {
          return 'd';
        }
        let absPath = await utils.normalizeRemotePath(this, remotePath);
        try {
          let info = await this.stat(absPath);
          if (info.isDirectory) {
            return 'd';
          }
          if (info.isSymbolicLink) {
            return 'l';
          }
          if (info.isFile) {
            return '-';
          }
          return false;
        } catch (err) {
          if (err.code === errorCode.notexist) {
            return false;
          }
          throw err;
        }
      } else {
        return false;
      }
    } catch (err) {
      throw utils.formatError(err, 'exists');
    }
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
    const _list = (aPath, filter) => {
      return new Promise((resolve, reject) => {
        const reg = /-/gi;
        let errorListener;

        try {
          errorListener = utils.makeErrorListener(reject, this, 'list');
          this.client.prependListener('error', errorListener);
          this.sftp.readdir(aPath, (err, fileList) => {
            if (err) {
              reject(utils.formatError(`${err.message} ${aPath}`, '_list'));
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
              if (filter instanceof RegExp) {
                regex = filter;
              } else {
                let newPattern = filter.replace(/\*([^*])*?/gi, '.*');
                regex = new RegExp(newPattern);
              }
              resolve(newList.filter(item => regex.test(item.name)));
            }
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'list');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.readDir
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'list', pathInfo.code);
        throw e;
      }
      return _list(pathInfo.path, pattern);
    } catch (err) {
      throw utils.formatError(err, 'list');
    }
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
          errorListener = utils.makeErrorListener(reject, this, 'get');
          this.client.prependListener('error', errorListener);
          let rdr = this.sftp.createReadStream(sftpPath, options);
          rdr.once('error', err => {
            utils.removeListeners(rdr);
            reject(utils.formatError(`${err.message} ${sftpPath}`, '_get'));
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
              wtr = localDst;
            }
            wtr.once('error', err => {
              utils.removeListeners(rdr);
              reject(
                utils.formatError(
                  `${err.message} ${typeof dst === 'string' ? localDst : ''}`,
                  '_get'
                )
              );
            });
            wtr.once('finish', () => {
              utils.removeListeners(rdr);
              if (typeof localDst === 'string') {
                resolve(localDst);
              } else {
                resolve(wtr);
              }
            });
            rdr.pipe(wtr);
          }
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'get');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.readFile
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'get', pathInfo.code);
        throw e;
      }
      if (typeof dst === 'string') {
        let localInfo = await utils.checkLocalPath(dst, targetType.writeFile);
        if (localInfo.valid) {
          dst = localInfo.path;
        } else {
          let e = utils.formatError(localInfo.msg, 'get', localInfo.code);
          throw e;
        }
      }
      return _get(pathInfo.path, dst, options);
    } catch (err) {
      throw utils.formatError(err, 'get');
    }
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
    const _fastGet = (from, to, opts) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'fastGet');
          this.client.prependListener('error', errorListener);
          this.sftp.fastGet(from, to, opts, err => {
            if (err) {
              reject(
                utils.formatError(
                  `${err.message} src: ${from} dst: ${to}`,
                  'fastGet'
                )
              );
            }
            resolve(`${from} was successfully download to ${to}!`);
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'fastGet');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.readFile
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'fastGet', pathInfo.code);
        throw e;
      }
      let localInfo = await utils.checkLocalPath(
        localPath,
        targetType.writeFile
      );
      if (!localInfo.valid) {
        let e = utils.formatError(
          localInfo.parentMsg,
          'fastGet',
          localInfo.parentCode
        );
        throw e;
      }
      return _fastGet(pathInfo.path, localInfo.path, options);
    } catch (err) {
      throw utils.formatError(err, 'fastGet');
    }
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
    const _fastPut = (from, to, opts) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'fastPut');
          this.client.prependListener('error', errorListener);
          this.sftp.fastPut(from, to, opts, err => {
            if (err) {
              reject(
                utils.formatError(
                  `${err.message} Local: ${from} Remote: ${to}`,
                  '_fastPut'
                )
              );
            }
            resolve(`${from} was successfully uploaded to ${to}!`);
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'fastPut');
      let localInfo = await utils.checkLocalPath(localPath);
      if (!localInfo.valid) {
        let e = utils.formatError(localInfo.msg, 'fastPut', localInfo.code);
        throw e;
      }
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.writeFile
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'fastPut', pathInfo.code);
        throw e;
      }
      return _fastPut(localInfo.path, pathInfo.path, options);
    } catch (err) {
      throw utils.formatError(err, 'fastPut');
    }
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
    const _put = (src, dst, opts) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'put');
          this.client.prependListener('error', errorListener);
          let stream = this.sftp.createWriteStream(dst, opts);
          stream.once('error', err => {
            reject(utils.formatError(`${err.message} ${dst}`, 'put'));
          });
          stream.once('finish', () => {
            utils.removeListeners(stream);
            resolve(`Uploaded data stream to ${dst}`);
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
            rdr.once('error', err => {
              utils.removeListeners(stream);
              reject(
                utils.formatError(
                  `${err.message} ${
                    typeof localSrc === 'string' ? localSrc : ''
                  }`,
                  'put'
                )
              );
            });
            rdr.pipe(stream);
          }
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'put');
      if (typeof localSrc === 'string') {
        let localInfo = await utils.checkLocalPath(localSrc);
        if (!localInfo.valid) {
          let e = utils.formatError(localInfo.msg, 'put', localInfo.code);
          throw e;
        }
        localSrc = localInfo.path;
      }
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.writeFile
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'put', pathInfo.code);
        throw e;
      }
      return _put(localSrc, pathInfo.path, options);
    } catch (err) {
      throw utils.formatError(err, 'put');
    }
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
    const _append = (data, aPath, opts) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'append');
          this.client.prependListener('error', errorListener);
          let writerOptions;
          if (opts) {
            writerOptions = opts;
            writerOptions.flags = 'a';
          } else {
            writerOptions = {
              flags: 'a'
            };
          }
          let stream = this.sftp.createWriteStream(aPath, writerOptions);
          stream.once('error', err => {
            utils.removeListeners(stream);
            reject(utils.formatError(`${err.message} ${aPath}`, '_append'));
          });
          stream.once('finish', () => {
            utils.removeListeners(stream);
            resolve(`Uploaded data stream to ${aPath}`);
          });
          if (data instanceof Buffer) {
            stream.end(data);
          } else {
            data.pipe(stream);
          }
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'append');
      if (typeof input === 'string') {
        let e = utils.formatError(
          'Cannot append one file to another',
          'append',
          errorCode.badPath
        );
        throw e;
      }
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.writeFile
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'append', pathInfo.code);
        throw e;
      }
      let stats = await this.stat(pathInfo.path);
      if ((stats.mode & 0o0444) === 0) {
        let e = utils.formatError(
          `Permission denied: ${remotePath}`,
          'append',
          errorCode.permission
        );
        throw e;
      }
      return _append(input, pathInfo.path, options);
    } catch (err) {
      throw utils.formatError(err, 'append');
    }
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
  async mkdir(remotePath, recursive = false) {
    const _mkdir = p => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'mkdir');
          this.client.prependListener('error', errorListener);
          this.sftp.mkdir(p, err => {
            if (err) {
              reject(
                utils.formatError(`${err.message} ${p}`, '_mkdir', err.code)
              );
            }
            resolve(`${p} directory created`);
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'mkdir');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.writeDir
      );
      if (!pathInfo.valid) {
        throw utils.formatError(pathInfo.msg, 'mkdir', pathInfo.code);
      }
      if (pathInfo.type === 'd') {
        return `${pathInfo.path} already exists`;
      }
      if (!recursive) {
        return _mkdir(pathInfo.path);
      }
      let dir = parse(pathInfo.path).dir;
      let parent = await utils.checkRemotePath(this, dir, targetType.writeDir);
      if (parent.valid && !parent.type) {
        await this.mkdir(dir, true);
      }
      return _mkdir(pathInfo.path);
    } catch (err) {
      throw utils.formatError(err, 'mkdir');
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
    const _rmdir = p => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'rmdir');
          this.client.prependListener('error', errorListener);
          this.sftp.rmdir(p, err => {
            if (err) {
              reject(
                utils.formatError(`${err.message} ${p}`, '_rmdir', err.code)
              );
            }
            resolve('Successfully removed directory');
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'rmdir');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.writeDir
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'rmdir', pathInfo.code);
        throw e;
      }
      if (!recursive) {
        return _rmdir(pathInfo.path);
      }
      let list = await this.list(pathInfo.path);
      if (list.length) {
        let files = list.filter(item => item.type !== 'd');
        let dirs = list.filter(item => item.type === 'd');
        for (let f of files) {
          await this.delete(pathInfo.path + this.remotePathSep + f.name);
        }
        for (let d of dirs) {
          await this.rmdir(pathInfo.path + this.remotePathSep + d.name, true);
        }
      }
      return _rmdir(pathInfo.path);
    } catch (err) {
      throw utils.formatError(err, 'rmdir');
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
    const _delete = p => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'delete');
          this.client.prependListener('error', errorListener);
          this.sftp.unlink(p, err => {
            if (err) {
              reject(
                utils.formatError(`${err.message} ${p}`, '_delete', err.code)
              );
            }
            resolve('Successfully deleted file');
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'delete');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.writeFile
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'delete', pathInfo.code);
        throw e;
      }
      return _delete(pathInfo.path);
    } catch (err) {
      throw utils.formatError(err, 'delete');
    }
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
    const _rename = (from, to) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'rename');
          this.client.prependListener('error', errorListener);
          this.sftp.rename(from, to, err => {
            if (err) {
              reject(
                utils.formatError(
                  `${err.message} From: ${from} To: ${to}`,
                  '_rename'
                )
              );
            }
            resolve(`Successfully renamed ${from} to ${to}`);
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'rename');
      let fromInfo = await utils.checkRemotePath(
        this,
        fromPath,
        targetType.readObj
      );
      if (!fromInfo.valid) {
        let e = utils.formatError(fromInfo.msg, 'rename', fromInfo.code);
        throw e;
      }
      let toInfo = await utils.checkRemotePath(
        this,
        toPath,
        targetType.writeObj
      );
      if (toInfo.type) {
        let e = utils.formatError(
          `Permission denied: ${toInfo.path} already exists`,
          'rename',
          errorCode.permission
        );
        throw e;
      }
      if (!toInfo.valid) {
        let e = utils.formatError(
          toInfo.parentMsg,
          'rename',
          toInfo.parentCode
        );
        throw e;
      }
      return _rename(fromInfo.path, toInfo.path);
    } catch (err) {
      throw utils.formatError(err, 'rename');
    }
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
    const _chmod = (p, m) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'chmod');
          this.client.prependListener('error', errorListener);
          this.sftp.chmod(p, m, err => {
            if (err) {
              reject(utils.formatError(`${err.message} ${p}`, '_chmod'));
            }
            resolve('Successfully change file mode');
          });
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'chmod');
      let pathInfo = await utils.checkRemotePath(
        this,
        remotePath,
        targetType.readObj
      );
      if (!pathInfo.valid) {
        let e = utils.formatError(pathInfo.msg, 'chmod', pathInfo.code);
        throw e;
      }
      return _chmod(pathInfo.path, mode);
    } catch (err) {
      throw utils.formatError(err, 'chmod');
    }
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
      utils.haveConnection(this, 'uploadDir');
      let localInfo = await utils.checkLocalPath(srcDir, targetType.readDir);
      if (!localInfo.valid) {
        let e = utils.formatError(localInfo.msg, 'uploadDir', localInfo.code);
        throw e;
      }
      let remoteInfo = await utils.checkRemotePath(
        this,
        dstDir,
        targetType.writeDir
      );
      if (!remoteInfo.valid) {
        let e = utils.formatError(remoteInfo.msg, 'uploadDir', remoteInfo.code);
        throw e;
      }
      if (!remoteInfo.type) {
        await this.mkdir(remoteInfo.path, true);
      }
      let dirEntries = fs.readdirSync(localInfo.path, {
        encoding: 'utf8',
        withFileTypes: true
      });
      for (let e of dirEntries) {
        if (e.isDirectory()) {
          let newSrc = join(localInfo.path, e.name);
          let newDst = remoteInfo.path + this.remotePathSep + e.name;
          await this.uploadDir(newSrc, newDst);
        } else if (e.isFile()) {
          let src = join(localInfo.path, e.name);
          let dst = remoteInfo.path + this.remotePathSep + e.name;
          await this.fastPut(src, dst);
          this.client.emit('upload', {source: src, destination: dst});
        } else {
          console.log(`uploadDir: File ignored: ${e.name} not a regular file`);
        }
      }
      return `${localInfo.path} uploaded to ${remoteInfo.path}`;
    } catch (err) {
      return utils.handleError(err, 'uploadDir');
    }
  }

  async downloadDir(srcDir, dstDir) {
    try {
      utils.haveConnection(this, 'downloadDir');
      let remoteInfo = await utils.checkRemotePath(
        this,
        srcDir,
        targetType.readDir
      );
      if (!remoteInfo.valid) {
        let e = utils.formatError(
          remoteInfo.msg,
          'downloadDir',
          remoteInfo.code
        );
        throw e;
      }
      let localInfo = await utils.checkLocalPath(dstDir, targetType.writeDir);
      if (localInfo.valid && !localInfo.type) {
        fs.mkdirSync(localInfo.path, {recursive: true});
      }
      if (!localInfo.valid) {
        let e = utils.formatError(localInfo.msg, 'downloadDir', localInfo.code);
        throw e;
      }
      let fileList = await this.list(remoteInfo.path);
      for (let f of fileList) {
        if (f.type === 'd') {
          let newSrc = remoteInfo.path + this.remotePathSep + f.name;
          let newDst = join(localInfo.path, f.name);
          await this.downloadDir(newSrc, newDst);
        } else if (f.type === '-') {
          let src = remoteInfo.path + this.remotePathSep + f.name;
          let dst = join(localInfo.path, f.name);
          await this.fastGet(src, dst);
          this.client.emit('download', {source: src, destination: dst});
        } else {
          console.log(`downloadDir: File ignored: ${f.name} not regular file`);
        }
      }
      return `${remoteInfo.path} downloaded to ${localInfo.path}`;
    } catch (err) {
      return utils.handleError(err, 'downloadDir');
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
        utils.handleError(err, 'end', reject);
      }
    });
  }
}

module.exports = SftpClient;
