/**
 * ssh2 sftp client for node
 */
'use strict';

let Client = require('ssh2').Client;

let SftpClient = function(){
  this.client = new Client();
};

/**
 * Retrieves a directory listing
 *
 * @param {String} path, a string containing the path to a directory
 * @return {Promise} data, list info
 */
SftpClient.prototype.list = function(path) {
  let reg = /-/gi;

  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      sftp.readdir(path, (err, list) => {
        if (err) {
          return reject(new Error(`Failed to list ${path}: ${err.message}`));
        }
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
                group: item.longname.substr(4,3).replace(reg, ''),
                other: item.longname.substr(7, 3).replace(reg, '')
              },
              owner: item.attrs.uid,
              group: item.attrs.gid
            };
          });
        }
        return resolve(newList);
      });
    } else {
      return reject(Error('sftp connect error'));
    }
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

    if (sftp) {
      sftp.stat(remotePath, function (err, stats) {
        if (err){
          return reject(new Error(`Failed to stat ${remotePath}: ${err.message}`));
        }
        // format similarly to sftp.list
        return resolve({
          mode: stats.mode,
          permissions: stats.permissions,
          owner: stats.uid,
          group: stats.guid,
          size: stats.size,
          accessTime: stats.atime * 1000,
          modifyTime: stats.mtime * 1000
        });
      });
    } else {
      return reject(Error('sftp connect error'));
    }
  });
};

/**
 * get file
 *
 * @param {String} path, path
 * @param {Object} useCompression, config options
 * @param {String} encoding. Encoding for the ReadStream, can be any value
 * supported by node streams. Use 'null' for binary
 * (https://nodejs.org/api/stream.html#stream_readable_setencoding_encoding)
 * @return {Promise} stream, readable stream
 */
SftpClient.prototype.get = function(path, useCompression, encoding, otherOptions) {
  let options = this.getOptions(useCompression, encoding, otherOptions);

  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      try {
        this.client.on('error', reject);
       
        let stream = sftp.createReadStream(path, options);
        
        stream.on('error', (err) => {
          this.client.removeListener('error', reject);
          return reject(new Error(`Failed get for ${path}: ${err.message}`));
        });
        stream.on('readable', () => {
          this.client.removeListener('error', reject);
          return resolve(stream);
        });
      } catch(err) {
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
  options = options || {};
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;
    
    if (sftp) {
      sftp.fastGet(remotePath, localPath, options, function (err) {
        if (err){
          return reject(new Error(`Failed to get ${remotePath}: ${err.message}`));
        }
        return resolve(`${remotePath} was successfully download to ${localPath}!`);
      });
    } else {
      return reject(Error('sftp connect error'));
    }
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
  options = options || {};
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      sftp.fastPut(localPath, remotePath, options, function (err) {
        if (err) {
          return reject(new Error(`Failed to upload ${localPath} to ${remotePath}: ${err.message}`));
        }
        return resolve(`${localPath} was successfully uploaded to ${remotePath}!`);
      });
    } else {
      return reject(new Error('sftp connect error'));
    }
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
SftpClient.prototype.put = function(input, remotePath, useCompression, encoding, otherOptions) {
  let options = this.getOptions(useCompression, encoding, otherOptions);

  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      if (typeof input === 'string') {
        sftp.fastPut(input, remotePath, options, (err) => {
          if (err) {
            return reject(new Error(`Failed to upload ${input} to ${remotePath}: ${err.message}`));
          }
          return resolve(`Uploaded ${input} to ${remotePath}`);
        });
        return false;
      }
      let stream = sftp.createWriteStream(remotePath, options);

      stream.on('error', err => {
        return reject(new Error(`Failed to upload data stream to ${remotePath}: ${err.message}`));
      });
      
      stream.on('close', () => {
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

SftpClient.prototype.mkdir = function(path, recursive) {
  recursive = recursive || false;

  return new Promise((resolve, reject) => {
    let sftp = this.sftp;
    
    if (sftp) {
      if (!recursive) {
        sftp.mkdir(path, (err) => {
          if (err) {
            return reject(new Error(`Failed to create directory ${path}: ${err.message}`));
          }
          return resolve(`${path} directory created`);
        });
      }
      
      let tokens = path.split(/\//g);
      let p = '';
      
      let mkdir = () => {
        let token = tokens.shift();
        
        if (!token && !tokens.length) {
          return resolve(`${path} directory created`);
        }
        p = p + `${token}/`;
        sftp.mkdir(p, (err) => {
          if (err && ![4, 11].includes(err.code)) {
            return reject(new Error(`Failed to create directory ${path}: ${p} ${err.message}`));
          }
          return mkdir();
        });
        return false;
      };
      return mkdir();
    } else {
      return reject(new Error('sftp connect error'));
    }
  });
};

SftpClient.prototype.rmdir = function(path, recursive) {
  recursive = recursive || false;

  return new Promise((resolve, reject) => {
    let sftp = this.sftp;
    
    if (sftp) {
      if (!recursive) {
        return sftp.rmdir(path, (err) => {
          if (err) {
            return reject(new Error(`Failed to remove directory ${path}: ${err.message}`));
          }
          return resolve('Successfully removed directory');
        });
      }
      let rmdir = p => {
        return this.list(p)
          .then(list => {
            if (list.length > 0) {
              let promises = [];
            
              list.forEach(item => {
                let name = item.name;
                var subPath;
              
                if (name[0] === '/') {
                  subPath = name;
                } else {
                  if (p[p.length - 1] === '/') {
                    subPath = p + name;
                  } else {
                    subPath = p + '/' + name;
                  }
                }
              
                if (item.type === 'd') {
                  if (name !== '.' || name !== '..') {
                    promises.push(rmdir(subPath));
                  }
                } else {
                  promises.push(this.delete(subPath));
                }
              });
              if (promises.length) {
                return Promise.all(promises)
                  .then(() => {
                    return rmdir(p);
                  })
                  .catch(err => {
                    return reject(`Failed to remove directory ${path}: ${err.message}`);
                  });
              }
            } else {
              return new Promise((resolve, reject) => {
                return sftp.rmdir(p, (err) => {
                  if (err) {
                    return reject(new Error(`Failed to remove directory ${path}: ${err.message}`));
                  }
                  return resolve('Successfully removed directory');
                });
              });
            }
          });
      };
      return rmdir(path)
        .then(() => {
          return resolve('Successfully removed directory');
        })
        .catch((err) => {
          return reject(new Error(`Failed to remove directory ${path}: ${err.message}`));
        });
    } else {
      return reject(new Error('sftp connect error'));
    }
  });
};

SftpClient.prototype.delete = function(path) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      sftp.unlink(path, (err) => {
        if (err) {
          return reject(new Error(`Failed to delete file ${path}: ${err.message}`));
        }
        return resolve('Successfully deleted file');
      });
    } else {
      return reject(new Error('sftp connect error'));
    }
  });
};

SftpClient.prototype.rename = function(srcPath, remotePath) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      sftp.rename(srcPath, remotePath, (err) => {
        if (err) {
          return reject(new Error(`Failed to rename file ${srcPath} to ${remotePath}: ${err.message}`));
        }
        return resolve(`Successfully renamed ${srcPath} to ${remotePath}`);
      });
    } else {
      return reject(new Error('sftp connect error'));
    }
  });
};

SftpClient.prototype.chmod = function(remotePath, mode) {
  return new Promise((resolve, reject) => {
    let sftp = this.sftp;

    if (sftp) {
      sftp.chmod(remotePath, mode, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    } else {
      return reject(Error('sftp connect error'));
    }
  });
};

SftpClient.prototype.connect = function(config, connectMethod) {
  connectMethod = connectMethod || 'on';

  return new Promise((resolve, reject) => {
    this.client[connectMethod]('ready', () => {
      this.client.sftp((err, sftp) => {
        //this.client.removeListener('error', reject);
        if (err) {
          return reject(new Error(`Failed to connect to server: ${err.message}`));
        }
        this.sftp = sftp;
        return resolve(sftp);
      });
    })
      //.on('error', reject)
      .connect(config);
  });
};

SftpClient.prototype.end = function() {
  return new Promise((resolve) => {
    this.client.end();
    resolve();
  });
};

SftpClient.prototype.getOptions = function(useCompression, encoding, otherOptions) {
  if(encoding === undefined){
    encoding = 'utf8';
  }
  let options = Object.assign({}, otherOptions || {}, {encoding: encoding}, useCompression);
  return options;
};

// add Event type support
SftpClient.prototype.on = function(eventType, callback) {
  this.client.on(eventType, callback);
};


module.exports = SftpClient;

// sftp = new SftpClient()
// sftp.client.on('event')
//
// sftp.on('end', ()=>{})   => this.client.on('event', callback)
// sftp.on('error', () => {})
