/**
 * ssh2 sftp client for node
 */

'use strict';

const Client = require('ssh2').Client;
const osPath = require('path').posix;
const utils = require('./utils');
const fs = require('fs');
const concat = require('concat-stream');

let SftpClient = function() {
  this.client = new Client();
};

/**
 * Retrieves a directory listing
 *
 * @param {String} path, a string containing the path to a directory
 * @return {Promise} data, list info
 */
SftpClient.prototype.list = function(path) {
  const reg = /-/gi;

  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(new Error('sftp connect error'));
    }
    sftp.readdir(path, (err, list) => {
      if (err) {
        reject(new Error(`Failed to list ${path}: ${err.message}`));
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
        resolve(newList);
      }
    });
    return undefined;
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
SftpClient.prototype.exists = function(path) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(new Error('sftp connect error'));
    }
    let {dir, base} = osPath.parse(path);
    sftp.readdir(dir, (err, list) => {
      if (err) {
        if (err.code === 2) {
          resolve(false);
        } else {
          reject(
            new Error(`Error listing ${dir}: code: ${err.code} ${err.message}`)
          );
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
    return undefined;
  });
};

/**
 * Retrieves attributes for path
 *
 * @param {String} path, a string containing the path to a file
 * @return {Promise} stats, attributes info
 */
SftpClient.prototype.stat = function(remotePath) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(Error('sftp connect error'));
    }
    sftp.stat(remotePath, function(err, stats) {
      if (err) {
        reject(new Error(`Failed to stat ${remotePath}: ${err.message}`));
      } else {
        // format similarly to sftp.list
        resolve({
          mode: stats.mode,
          permissions: stats.permissions,
          owner: stats.uid,
          group: stats.gid,
          size: stats.size,
          accessTime: stats.atime * 1000,
          modifyTime: stats.mtime * 1000
        });
      }
    });
    return undefined;
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
SftpClient.prototype.get = function(path, dst, options) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      try {
        let rdr = sftp.createReadStream(path, options);

        rdr.on('error', err => {
          return reject(new Error(`Failed to get ${path}: ${err.message}`));
        });

        if (dst === undefined) {
          // no dst specified, return buffer of data
          let concatStream = concat(buff => {
            return resolve(buff);
          });
          rdr.pipe(concatStream);
        } else if (typeof dst === 'string') {
          // dst local file path
          let wtr = fs.createWriteStream(dst);
          wtr.on('error', err => {
            return reject(new Error(`Failed get for ${path}: ${err.message}`));
          });
          wtr.on('finish', () => {
            return resolve(dst);
          });
          rdr.pipe(wtr);
        } else {
          // assume dst is a writeStream
          dst.on('finish', () => {
            return resolve(dst);
          });
          rdr.pipe(dst);
        }
      } catch (err) {
        this.client.removeListener('error', reject);
        return reject(new Error(`Failed get on ${path}: ${err.message}`));
      }
    } else {
      return reject(new Error('sftp connect error'));
    }
  });
};

/**
 * Use SSH2 fastGet for downloading the file.
 * Downloads a file at remotePath to localPath using parallel reads for faster throughput.
 * See 'fastGet' at https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
 * @param {String} remotePath
 * @param {String} localPath
 * @param {Object} options
 * @return {Promise} the result of downloading the file
 */
SftpClient.prototype.fastGet = function(remotePath, localPath, options) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(Error('sftp connect error'));
    }
    sftp.fastGet(remotePath, localPath, options, function(err) {
      if (err) {
        reject(new Error(`Failed to get ${remotePath}: ${err.message}`));
      }
      resolve(`${remotePath} was successfully download to ${localPath}!`);
    });
    return undefined;
  });
};

/**
 * Use SSH2 fastPut for uploading the file.
 * Uploads a file from localPath to remotePath using parallel reads for faster throughput.
 * See 'fastPut' at https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
 * @param {String} localPath
 * @param {String} remotePath
 * @param {Object} options
 * @return {Promise} the result of downloading the file
 */
SftpClient.prototype.fastPut = function(localPath, remotePath, options) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(new Error('sftp connect error'));
    }
    sftp.fastPut(localPath, remotePath, options, function(err) {
      if (err) {
        reject(
          new Error(
            `Failed to upload ${localPath} to ${remotePath}: ${err.message}`
          )
        );
      }
      resolve(`${localPath} was successfully uploaded to ${remotePath}!`);
    });
    return undefined;
  });
};

/**
 * Create file
 *
 * @param  {String|Buffer|stream} input
 * @param  {String} remotePath,
 * @param  {Object} useCompression [description]
 * @param  {String} encoding. Encoding for the WriteStream, can be any value supported by node streams.
 * @return {[type]}                [description]
 */
SftpClient.prototype.put = function(input, remotePath, options) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      if (typeof input === 'string') {
        sftp.fastPut(input, remotePath, options, err => {
          if (err) {
            return reject(
              new Error(
                `Failed to upload ${input} to ${remotePath}: ${err.message}`
              )
            );
          }
          return resolve(`Uploaded ${input} to ${remotePath}`);
        });
        return false;
      }
      let stream = sftp.createWriteStream(remotePath, options);

      stream.on('error', err => {
        return reject(
          new Error(
            `Failed to upload data stream to ${remotePath}: ${err.message}`
          )
        );
      });

      stream.on('finish', () => {
        return resolve(`Uploaded data stream to ${remotePath}`);
      });

      if (input instanceof Buffer) {
        stream.end(input);
        return false;
      }
      input.pipe(stream);
    } else {
      return reject(Error('sftp connect error'));
    }
  });
};

/**
 * Append to file
 *
 * @param  {Buffer|stream} input
 * @param  {String} remotePath,
 * @param  {Object} options
 * @return {[type]}                [description]
 */
SftpClient.prototype.append = function(input, remotePath, options) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      if (typeof input === 'string') {
        throw new Error('Cannot append a file to another');
      }
      let stream = sftp.createWriteStream(remotePath, options);

      stream.on('error', err => {
        return reject(
          new Error(
            `Failed to upload data stream to ${remotePath}: ${err.message}`
          )
        );
      });

      stream.on('finish', () => {
        return resolve(`Uploaded data stream to ${remotePath}`);
      });

      if (input instanceof Buffer) {
        stream.end(input);
        return false;
      }
      input.pipe(stream);
    } else {
      return reject(Error('sftp connect error'));
    }
  });
};

/**
 * @async
 *
 * Make a dirextory on remote server
 *
 * @param {string} path, remote directory path.
 * @param {boolean} recursive, if true, recursively create directories
 * @return {Promise}.
 */
SftpClient.prototype.mkdir = function(path, recursive = false) {
  let sftp = this.sftp;

  let doMkdir = p => {
    return new Promise((resolve, reject) => {
      if (!sftp) {
        return reject(new Error('sftp connect error'));
      }
      sftp.mkdir(p, err => {
        if (err) {
          reject(new Error(`Failed to create directory ${p}: ${err.message}`));
        }
        resolve(`${p} directory created`);
      });
      return undefined;
    });
  };

  if (!recursive) {
    return doMkdir(path);
  }
  let mkdir = p => {
    let {dir} = osPath.parse(p);
    return this.exists(dir)
      .then(type => {
        if (!type) {
          return mkdir(dir);
        }
      })
      .then(() => {
        return doMkdir(p);
      });
  };
  return mkdir(path);
};

/**
 * @async
 *
 * Remove directory on remote server
 *
 * @param {string} path, path to directory to be removed
 * @param {boolean} recursive, if true, remove direcories/files in target
 * @return {Promise}..
 */
SftpClient.prototype.rmdir = function(path, recursive = false) {
  let sftp = this.sftp;

  let doRmdir = p => {
    return new Promise((resolve, reject) => {
      if (!sftp) {
        return reject(new Error('sftp connect error'));
      }
      sftp.rmdir(p, err => {
        if (err) {
          reject(new Error(`Failed to remove directory ${p}: ${err.message}`));
        }
        resolve('Successfully removed directory');
      });
      return undefined;
    });
  };

  if (!recursive) {
    return doRmdir(path);
  }

  let rmdir = p => {
    let list;
    let files;
    let dirs;
    return this.list(p)
      .then(res => {
        list = res;
        files = list.filter(item => item.type === '-');
        dirs = list.filter(item => item.type === 'd');
        return utils.forEachAsync(files, f => {
          return this.delete(osPath.join(p, f.name));
        });
      })
      .then(() => {
        return utils.forEachAsync(dirs, d => {
          return rmdir(osPath.join(p, d.name));
        });
      })
      .then(() => {
        return doRmdir(p);
      });
  };
  return rmdir(path);
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
SftpClient.prototype.delete = function(path) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(new Error('sftp connect error'));
    }
    sftp.unlink(path, err => {
      if (err) {
        reject(new Error(`Failed to delete file ${path}: ${err.message}`));
      }
      resolve('Successfully deleted file');
    });
    return undefined;
  });
};

/**
 * @async
 *
 * Rename a file on the remote SFTP repository
 *
 * @param {sring} srcPath - path to the file to be renamced.
 * @param {string} remotePath - path to the new name.
 *
 * @return {Promise}
 *
 */
SftpClient.prototype.rename = function(srcPath, remotePath) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(new Error('sftp connect error'));
    }
    sftp.rename(srcPath, remotePath, err => {
      if (err) {
        reject(
          new Error(
            `Failed to rename file ${srcPath} to ${remotePath}: ${err.message}`
          )
        );
      }
      resolve(`Successfully renamed ${srcPath} to ${remotePath}`);
    });
    return undefined;
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
SftpClient.prototype.chmod = function(remotePath, mode) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (!sftp) {
      return reject(new Error('sftp connect error'));
    }
    sftp.chmod(remotePath, mode, err => {
      if (err) {
        reject(
          new Error(`Failed to change mode for ${remotePath}: ${err.message}`)
        );
      }
      resolve('Successfully change file mode');
    });
    return undefined;
  });
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
SftpClient.prototype.connect = function(config, connectMethod) {
  connectMethod = connectMethod || 'on';

  return new Promise((resolve, reject) => {
    this.client[connectMethod]('ready', () => {
      this.client.sftp((err, sftp) => {
        this.client.removeListener('error', reject);
        this.client.removeListener('end', reject);
        if (err) {
          reject(new Error(`Failed to connect to server: ${err.message}`));
        }
        this.sftp = sftp;
        resolve(sftp);
      });
    })
      .on('end', reject)
      .on('error', reject)
      .connect(config);
  });
};

/**
 * @async
 *
 * Close the SFTP connection
 *
 */
SftpClient.prototype.end = function() {
  return new Promise(resolve => {
    this.client.end();
    resolve();
  });
};

// add Event type support
SftpClient.prototype.on = function(eventType, callback) {
  this.client.on(eventType, callback);
};

module.exports = SftpClient;
