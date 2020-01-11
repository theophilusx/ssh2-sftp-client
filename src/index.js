/**
 * ssh2 sftp client for node
 */

'use strict';

const Client = require('ssh2').Client;
const fs = require('fs');
const concat = require('concat-stream');
const retry = require('retry');
const {join, posix} = require('path');
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
      } catch (err) {
        utils.handleError(err, 'realPath', reject);
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
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'list');
        this.client.prependListener('error', errorListener);
        this.sftp.readdir(pathInfo.path, (err, fileList) => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${pathInfo.path}`,
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
        utils.handleError(err, 'list', reject);
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
      if (utils.haveConnection(this, 'exists')) {
        if (remotePath === '.') {
          return 'd';
        }
        let absPath = await this.realPath(remotePath);
        if (!absPath) {
          return false;
        }
        let {root, dir, base} = posix.parse(absPath);
        if (dir === root && base === '') {
          return 'd';
        }
        let files = await this.list(dir);
        for (let f of files) {
          if (f.name === base) {
            return f.type;
          }
        }
        return false;
      } else {
        return false;
      }
    } catch (err) {
      return utils.handleError(err, 'exists');
    }
  }

  /**
   * Retrieves attributes for path
   *
   * @param {String} path, a string containing the path to a file
   * @return {Promise} stats, attributes info
   */
  async stat(remotePath) {
    utils.haveConnection(this, 'stat');
    let pathInfo = await utils.checkRemotePath(
      this,
      remotePath,
      targetType.readObj
    );
    if (!pathInfo.valid) {
      let e = utils.formatError(pathInfo.msg, 'stat', pathInfo.code);
      throw e;
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'stat');
        this.client.prependListener('error', errorListener);
        this.sftp.stat(pathInfo.path, (err, stats) => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${pathInfo.path}`,
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
        utils.handleError(err, 'stat', reject);
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
          errorListener = utils.makeErrorListener(reject, this, 'get');
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
              wtr = localDst;
            }
            wtr.once('error', err => {
              utils.removeListeners(rdr);
              reject(
                utils.formatError(
                  `${err.message} ${typeof dst === 'string' ? localDst : ''}`,
                  'get',
                  err.code
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
        } catch (err) {
          reject(utils.formatError(err, 'get'));
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

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
      if (
        localInfo.valid ||
        (localInfo.code === errorCode.notexist && localInfo.parentValid)
      ) {
        dst = localInfo.path;
      } else if (!localInfo.parentValid) {
        let e = utils.formatError(
          localInfo.parentMsg,
          'get',
          localInfo.parentCode
        );
        throw e;
      } else if (!localInfo.valid) {
        let e = utils.formatError(localInfo.msg, 'get', localInfo.code);
        throw e;
      }
    }
    return _get(pathInfo.path, dst, options);
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
    let localInfo = await utils.checkLocalPath(localPath, targetType.writeFile);
    if (!localInfo.valid && !localInfo.parentValid) {
      let e = utils.formatError(
        localInfo.parentMsg,
        'fastGet',
        localInfo.parentCode
      );
      throw e;
    } else if (!localInfo.valid && localInfo.code !== errorCode.notexist) {
      let e = utils.formatError(localInfo.msg, 'fastGet', localInfo.code);
      throw e;
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'fastGet');
        this.client.prependListener('error', errorListener);
        this.sftp.fastGet(pathInfo.path, localInfo.path, options, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} src: ${pathInfo.path} dst: ${localInfo.path}`,
                'fastGet',
                err.code
              )
            );
          }
          resolve(
            `${remotePath} was successfully download to ${localInfo.path}!`
          );
        });
      } catch (err) {
        utils.handleError(err, 'fastGet', reject);
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
    if (!pathInfo.valid && !pathInfo.parentValid) {
      let e = utils.formatError(
        pathInfo.parentMsg,
        'fastPut',
        pathInfo.parentCode
      );
      throw e;
    } else if (!pathInfo.valid && pathInfo.code !== errorCode.notexist) {
      let e = utils.formatError(pathInfo.msg, 'fastPut', pathInfo.code);
      throw e;
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'fastPut');
        this.client.prependListener('error', errorListener);
        this.sftp.fastPut(localInfo.path, pathInfo.path, options, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} Local: ${localInfo.path} Remote: ${pathInfo.path}`,
                'fastPut',
                err.code
              )
            );
          }
          resolve(
            `${localInfo.path} was successfully uploaded to ${pathInfo.path}!`
          );
        });
      } catch (err) {
        utils.handleError(err, 'fastPut', reject);
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
    const _put = (src, dst, opts) => {
      return new Promise((resolve, reject) => {
        let errorListener;
        try {
          errorListener = utils.makeErrorListener(reject, this, 'put');
          this.client.prependListener('error', errorListener);
          let stream = this.sftp.createWriteStream(dst, opts);
          stream.on('error', err => {
            reject(utils.formatError(`${err.message} ${dst}`, 'put', err.code));
          });
          stream.on('finish', () => {
            utils.removeListeners(stream);
            resolve(`Uploaded data stream to ${pathInfo.path}`);
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
                  'put',
                  err.code
                )
              );
            });
            rdr.pipe(stream);
          }
        } catch (err) {
          utils.handleError(err, 'put', reject);
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };
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
    if (!pathInfo.valid && !pathInfo.parentValid) {
      let e = utils.formatError(pathInfo.parentMsg, 'put', pathInfo.parentCode);
      throw e;
    } else if (!pathInfo.valid && pathInfo.code !== errorCode.notexist) {
      let e = utils.formatError(pathInfo.msg, 'put', pathInfo.code);
      throw e;
    }
    return _put(localSrc, pathInfo.path, options);
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
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'append');
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
        let stream = this.sftp.createWriteStream(pathInfo.path, writerOptions);
        stream.on('error', err => {
          utils.removeListeners(stream);
          reject(
            utils.formatError(
              `${err.message} ${pathInfo.path}`,
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
        utils.handleError(err, 'append', reject);
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
          errorListener = utils.makeErrorListener(reject, this, 'mkdir');
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
          if (err.custom) {
            reject(err);
          } else {
            reject(utils.formatError(err, 'mkdir'));
          }
        } finally {
          this.removeListener('error', errorListener);
        }
      });
    };

    try {
      utils.haveConnection(this, 'mkdir');
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
        let e = utils.formatError(
          'Bad directory path',
          'mkdir',
          errorCode.badPath
        );
        throw e;
      }
      return doMkdir(realPath);
    } catch (err) {
      return utils.handleError(err, 'mkdir');
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
          errorListener = utils.makeErrorListener(reject, this, 'rmdir');
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
        return doRmdir(pathInfo.path);
      }
      let list = await this.list(pathInfo.path);
      if (list.length) {
        let files = list.filter(item => item.type !== 'd');
        let dirs = list.filter(item => item.type === 'd');
        for (let f of files) {
          try {
            await this.delete(pathInfo.path + this.remotePathSep + f.name);
          } catch (err) {
            throw utils.formatError(err, 'rmdir');
          }
        }
        for (let d of dirs) {
          try {
            await this.rmdir(pathInfo.path + this.remotePathSep + d.name, true);
          } catch (err) {
            throw utils.formatError(err, 'rmdir');
          }
        }
      }
      return doRmdir(pathInfo.path);
    } catch (err) {
      return utils.handleError(err, 'rmdir');
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
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'delete');
        this.client.prependListener('error', errorListener);
        this.sftp.unlink(pathInfo.path, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} ${pathInfo.path}`,
                'delete',
                err.code
              )
            );
          }
          resolve('Successfully deleted file');
        });
      } catch (err) {
        utils.handleError(err, 'delete', reject);
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
    let toInfo = await utils.checkRemotePath(this, toPath, targetType.writeObj);
    if (toInfo.valid) {
      let e = utils.formatError(
        `Permission denied: ${toInfo.path} already exists`,
        'rename',
        errorCode.permission
      );
      throw e;
    }
    if (!toInfo.valid && !toInfo.parentValid) {
      let e = utils.formatError(toInfo.parentMsg, 'rename', toInfo.parentCode);
      throw e;
    }
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'rename');
        this.client.prependListener('error', errorListener);
        this.sftp.rename(fromInfo.path, toInfo.path, err => {
          if (err) {
            reject(
              utils.formatError(
                `${err.message} From: ${fromInfo.path} To: ${toInfo.path}`,
                'rename',
                err.code
              )
            );
          }
          resolve(`Successfully renamed ${fromInfo.path} to ${toInfo.path}`);
        });
      } catch (err) {
        utils.handleError(err, 'rename', reject);
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
    return new Promise((resolve, reject) => {
      let errorListener;
      try {
        errorListener = utils.makeErrorListener(reject, this, 'chmod');
        this.client.prependListener('error', errorListener);
        this.sftp.chmod(pathInfo.path, mode, err => {
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
        utils.handleError(err, 'chmod', reject);
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
      if (
        !remoteInfo.valid &&
        remoteInfo.code === errorCode.notdir &&
        remoteInfo.parentValid
      ) {
        await this.mkdir(remoteInfo.path, true);
      } else if (!remoteInfo.valid && !remoteInfo.parentValid) {
        let e = utils.formatError(
          remoteInfo.parentMsg,
          'uploadDir',
          remoteInfo.parentCode
        );
        throw e;
      } else if (!remoteInfo.valid && remoteInfo.code !== errorCode.notexist) {
        let e = utils.formatError(remoteInfo.msg, 'uploadDir', remoteInfo.code);
        throw e;
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
      if (!localInfo.valid && localInfo.code === errorCode.notexist) {
        if (localInfo.parentValid) {
          fs.mkdirSync(localInfo.path, {recursive: true});
        } else {
          let e = utils.formatError(
            localInfo.parentMsg,
            'downloadDir',
            localInfo.parentCode
          );
          throw e;
        }
      } else if (!localInfo.valid) {
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
