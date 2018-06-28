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
            this.client.on('error', (err) => {
                reject(err);
            });
            sftp.readdir(path, (err, list) => {
                if (err) {
                    reject(err);
                    return false;
                }
                // reset file info
                list.forEach((item, i) => {
                    list[i] = {
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
                    }
                });
                resolve(list);
            });
        } else {
            reject(Error('sftp connect error'));
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
          return reject(err);
        }
        
        // format output similarly to sftp.list()
        stats = {
          mode: stats.mode,
          permissions: stats.permissions,
          owner: stats.uid,
          group: stats.guid,
          size: stats.size,
          accessTime: stats.atime * 1000,
          modifyTime: stats.mtime * 1000
        }
        
        return resolve(stats);
      });
    } else {
      reject(Error('sftp connect error'));
    }
  });
};

/**
 * get file
 *
 * @param {String} path, path
 * @param {Object} useCompression, config options
 * @param {String} encoding. Encoding for the ReadStream, can be any value supported by node streams. Use 'null' for binary (https://nodejs.org/api/stream.html#stream_readable_setencoding_encoding)
 * @return {Promise} stream, readable stream
 */
SftpClient.prototype.get = function(path, useCompression, encoding, otherOptions) {
    let options = this.getOptions(useCompression, encoding, otherOptions)

    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            try {
                this.client.on('error', (err) => {
                    reject(err);
                });

                let stream = sftp.createReadStream(path, options);

                stream.on('error', (err) => {
                    reject(err);
                });
                // after V10.0.0, 'readable' takes precedence in controlling the flow,
                // i.e. 'data' will be emitted only when stream.read() is called
                stream.on('readable', () => {
                    let chunk;
                    while((chunk = stream.read()) !== null) {
                        resolve(chunk)
                    }
                });
            } catch(err) {
                reject(err);
            }
        } else {
            reject(Error('sftp connect error'));
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
                    return reject(err);
                }
                return resolve(`${remotePath} was successfully download to ${localPath}!`);
            });
        } else {
            reject(Error('sftp connect error'));
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
                if (err){
                    return reject(err);
                }
                return resolve(`${localPath} was successfully uploaded to ${remotePath}!`);
            });
        } else {
            reject(Error('sftp connect error'));
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
    let options = this.getOptions(useCompression, encoding, otherOptions)

    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            this.client.on('error', (err) => {
                reject(err);
            });

            if (typeof input === 'string') {
                sftp.fastPut(input, remotePath, options, (err) => {
                    if (err) {
                        reject(err);
                        return false;
                    }
                    resolve();
                });
                return false;
            }
            let stream = sftp.createWriteStream(remotePath, options);
            let data;

            stream.on('error', reject);
            stream.on('close', resolve);

            if (input instanceof Buffer) {
                data = stream.end(input);
                return false;
            }
            data = input.pipe(stream);
        } else {
            reject(Error('sftp connect error'));
        }
    });
};

SftpClient.prototype.mkdir = function(path, recursive) {
    recursive = recursive || false;

    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            this.client.on('error', (err) => {
                reject(err);
            });

            if (!recursive) {
                sftp.mkdir(path, (err) => {
                    if (err) {
                        reject(err);
                        return false;
                    }
                    resolve();
                });
                return false;
            }

            let tokens = path.split(/\//g);
            let p = '';

            let mkdir = () => {
                let token = tokens.shift();

                if (!token && !tokens.length) {
                    resolve();
                    return false;
                }
                token += '/';
                p = p + token;
                sftp.mkdir(p, (err) => {
                    if (err && ![4, 11].includes(err.code)) {
                        reject(err);
                    }
                    mkdir();
                });
            };
            return mkdir();
        } else {
            reject(Error('sftp connect error'));
        }
    });
};

SftpClient.prototype.rmdir = function(path, recursive) {
    recursive = recursive || false;

    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            this.client.on('error', (err) => {
                reject(err);
            });

            if (!recursive) {
                return sftp.rmdir(path, (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            }
            let rmdir = (p) => {
                return this.list(p).then((list) => {
                    if (list.length > 0) {
                        let promises = [];

                        list.forEach((item) => {
                            let name = item.name;
                            let promise;
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
                                    promise = rmdir(subPath);
                                }
                            } else {
                                promise = this.delete(subPath);
                            }
                            promises.push(promise);
                        });
                        if (promises.length) {
                            return Promise.all(promises).then(() => {
                                return rmdir(p);
                            });
                        }
                    } else {
                        return new Promise((resolve, reject) => {
                            return sftp.rmdir(p, (err) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve();
                                }
                            });
                        });
                    }
                });
            };
            return rmdir(path).then(() => {resolve()})
                        .catch((err) => {reject(err)});
        } else {
            reject(Error('sftp connect error'));
        }
    });
};

SftpClient.prototype.delete = function(path) {
    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            this.client.on('error', (err) => {
                reject(err);
            });

            sftp.unlink(path, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        } else {
            reject(Error('sftp connect error'));
        }
    });
};

SftpClient.prototype.rename = function(srcPath, remotePath) {
    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            this.client.on('error', (err) => {
                reject(err);
            });

            sftp.rename(srcPath, remotePath, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        } else {
            reject(Error('sftp connect error'));
        }
    });
}

SftpClient.prototype.chmod = function(remotePath, mode) {
    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            this.client.on('error', (err) => {
                reject(err);
            });

            sftp.chmod(remotePath, mode, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        } else {
            reject(Error('sftp connect error'));
        }
    });
};

SftpClient.prototype.connect = function(config, connectMethod) {
    connectMethod = connectMethod || 'on';

    return new Promise((resolve, reject) => {
        this.client[connectMethod]('ready', () => {
            this.client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                }
                this.sftp = sftp;
                resolve(sftp);
            });
        }).on('error', (err) => {
            console.log('connect error event')
            reject(err);
        }).connect(config);
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
