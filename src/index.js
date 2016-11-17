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
            reject('sftp connect error');
        }
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
        let sftp = this.sftp;

        if (sftp) {
            try {
                let stream = sftp.createReadStream(path, useCompression);

                stream.on('error', reject);

                resolve(stream);
            } catch(err) {
                reject(err);
            }
        } else {
            reject('sftp connect error');
        }
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
        let sftp = this.sftp;

        if (sftp) {
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

            stream.on('error', reject);
            stream.on('close', resolve);

            if (input instanceof Buffer) {
                data = stream.end(input);
                return false;
            }
            data = input.pipe(stream);
        } else {
            reject('sftp connect error');
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
        } else {
            reject('sftp connect error');
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
            reject('sftp connect error');
        }
    });
};

SftpClient.prototype.delete = function(path) {
    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            sftp.unlink(path, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        } else {
            reject('sftp connect error');
        }
    });
};

SftpClient.prototype.rename = function(srcPath, remotePath) {
    return new Promise((resolve, reject) => {
        let sftp = this.sftp;

        if (sftp) {
            sftp.rename(srcPath, remotePath, (err) => {
                if (err) {
                    reject(err);
                    return false;
                }
                resolve();
            });
        } else {
            reject('sftp connect error');
        }
    });
}

SftpClient.prototype.connect = function(config) {
    var c = this.client;

    return new Promise((resolve, reject) => {
        this.client.on('ready', () => {

            this.client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                }
                this.sftp = sftp;
                resolve(sftp);
            });
        }).on('error', (err) => {
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

module.exports = SftpClient;
