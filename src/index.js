/**
 * ssh2 sftp client for node
 */
'use strict';

let Client = require('ssh2').Client;

// client.connect = config;

let SftpClient = function(){
    // this.closed = true;
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
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }
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
                // console.log('new list: ', list, new Date());
                resolve(list);
            });
        });
    });
};

/**
 * get file
 *
 * @param {String} path, path
 * @param {Object} useCompression, config options
 * @return {Promise} stream, readable stream
 */
SftpClient.prototype.get = function(path, useCompression) {
    useCompression = Object.assign({}, {encoding: 'utf8'}, useCompression);

    return new Promise((resolve, reject) => {
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }
            try {
                resolve(sftp.createReadStream(path, useCompression));
            } catch(err) {
                reject(err);
            }
        });
    });
};

/**
 * Create file
 *
 * @param  {String|Buffer|stream} input
 * @param  {String} remotePath,
 * @param  {Object} useCompression [description]
 * @return {[type]}                [description]
 */
SftpClient.prototype.put = function(input, remotePath, useCompression) {
    useCompression = Object.assign({}, {encoding: 'utf8'}, useCompression);

    return new Promise((resolve, reject) => {
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }
            if (typeof input === 'string') {
                sftp.fastPut(input, remotePath, useCompression, (err) => {
                    if (err) {
                        reject(err);
                        return false;
                    }
                    resolve();
                });
                return false;
            }
            let stream = sftp.createWriteStream(remotePath, useCompression);
            let data;

            stream.on('close', () => {
                resolve();
            });

            if (input instanceof Buffer) {
                data = stream.end(input);
                return false;
            }
            data = input.pipe(stream);
        });
    });
};

SftpClient.prototype.mkdir = function(path, recursive) {
    recursive = recursive || false;

    return new Promise((resolve, reject) => {
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }

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
                    if (err && err.code !== 4) {
                        reject(err);
                    }
                    mkdir();
                });
            };
            return mkdir();
        });
    });
};

// SftpClient.prototype._rmdir = function(sftp, path) {
//     sftp.rmdir(path, (err) => {
//         if (err) {
//             reject(err);
//         }
//         resolve();
//     });
// };

SftpClient.prototype.rmdir = function(path, recursive) {
    recursive = recursive || false;

    return new Promise((resolve, reject) => {
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }

            if (!recursive) {
                console.log('single');
                return sftp.rmdir(path, (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
                // return false;
            }
            console.log('recursive');
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

                            console.log('the list file name', name, '|', subPath);

                            if (item.type === 'd') {
                                if (name !== '.' || name !== '..') {
                                    promise = rmdir(subPath);
                                    // rmdir(p + '/' + item.name).then(() => {
                                    //     console.log('delete dir' + p + '/' + item.name);
                                    // });
                                    // return rmdir(subPath);//.then(() => r1());
                                }
                            } else {
                                console.log('delete file', subPath);
                                promise = this.delete(subPath);
                            }
                            promises.push(promise);
                        });
                        if (promises.length) {
                            return Promise.all(promises).then(() => {
                                rmdir(p);
                            });
                        }
                    } else {
                        console.log('delete dir' + p);
                        return sftp.rmdir(p, (err) => {
                            if (err) {
                                reject(err);
                            }
                            // resolve();
                        });
                    }
                });
            };
            return rmdir(path).then(() => {resolve('success')});
        });
    });
};

SftpClient.prototype.delete = function(path) {
    return new Promise((resolve, reject) => {
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }
            sftp.unlink(path, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        });
    });
};

SftpClient.prototype.rename = function(srcPath, remotePath) {
    return new Promise((resolve, reject) => {
        this.client.sftp((err, sftp) => {
            if (err) {
                reject(err);
                return false;
            }
            sftp.rename(srcPath, remotePath, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        });
    });
}

SftpClient.prototype.connect = function(config) {
    var c = this.client;
    console.log('this is connect');

    // return new Promise(this.client.connect(config))
    return new Promise((resolve, reject) => {
        this.client.on('ready', () => {
            console.log('the ready');
            resolve(this.client.sftp);
            // c.sftp(cb);
        }).on('error', (err) => {
            console.log(err, 'on ready reject')
            reject(err);
        }).connect(config);
    });
};

SftpClient.prototype.end = function() {
    this.client.end();
    console.log('end connect');
    // this.closed = true;
};

module.exports = SftpClient;
