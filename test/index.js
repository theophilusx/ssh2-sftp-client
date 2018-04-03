const stream = require('stream');
const chai = require('chai');
const path = require('path');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const Client = require('../src/index.js');
const sftp = new Client();

// use your test ssh server config
const config = {
    host: '172.29.84.8',
    username: 'jyu213',
    password: '**'
};
const BASIC_URL = path.resolve(__dirname, '../testServer/') + '/';

after(() => {
    sftp.end();
});

describe('list', () => {
    chai.use(chaiSubset);

    before(() => {
        return sftp.connect(config, 'once').then(() => {
            return sftp.mkdir(BASIC_URL + 'mocha-list/dir1', true);
        }).then(() => {
            return sftp.mkdir(BASIC_URL + 'mocha-list/dir2/sub1', true);
        }).then(() => {
            return sftp.put(new Buffer('hello file1'), BASIC_URL + 'mocha-list/file1.html', true);
        }).then(() => {
            return sftp.put(new Buffer('hello file2'), BASIC_URL + 'mocha-list/file2.md', true);
        });
    });
    after(() => {
        return sftp.connect(config, 'once').then(() => {
            return sftp.rmdir(BASIC_URL + 'mocha-list', true)
                .then(() => {
                    return sftp.end();
                });
        });

    });

    it('list return should be a promise', () => {
        return expect(sftp.list(BASIC_URL + 'mocha-list')).to.be.a('promise');
    });
    it('list return should be empty', () => {
        return expect(sftp.list(BASIC_URL + 'mocha-list/empty')).to.be.empty;
    });
    it('should return the list name of each', () => {
        return sftp.list(BASIC_URL + 'mocha-list').then((list) => {
            return expect(list).to.containSubset([{'name': 'dir1'}, {'name': 'dir2'}, {'name': 'file1.html'}, {'name': 'file2.md'}]);
        });
    });
});

describe('get', () => {
    before(() => {
        return sftp.connect(config, 'once').then(() => {
            return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-file.md', true);
        });
    });
    after(() => {
        return sftp.connect(config, 'once').then(() => {
            sftp.delete(BASIC_URL + 'mocha-file.md');
        }).then(() => {
            return sftp.end();
        });
    });

    it('return should be a promise', () => {
        return expect(sftp.get(BASIC_URL + 'mocha-file.md')).to.be.a('promise');
    });
    it('get the file content', () => {
        return sftp.get(BASIC_URL + 'mocha-file.md').then((data) => {
            let body = data.on('data', (chunk) => {
                body += chunk;
            });

            data.on('end', () => {
                expect(body).to.equal('hello');
            });
        });
    });
    it('get file faild', () => {
        return sftp.get(BASIC_URL + 'mocha-file1.md').catch((err) => {
            expect(err.message).to.equal('No such file');
        });
    });
});

describe('put', () => {
    before(() => {
        return sftp.connect(config, 'once');
    });
    after(() => {
        return sftp.delete(BASIC_URL + 'mocha-put-string.md').then(() => {
            return sftp.delete(BASIC_URL + 'mocha-put-buffer.md');
        }).then(() => {
            return sftp.delete(BASIC_URL + 'mocha-put-stream.md');
        }).then(() => {
            return sftp.end();
        });
    });

    it('return should be a promise', () => {
        return expect(sftp.put(new Buffer(''), BASIC_URL + 'mocha-put-buffer.md')).to.be.a('promise');
    });

    it('put local path file', () => {
        let path = __dirname + '/mocha.opts';
        return sftp.put(path, BASIC_URL + 'mocha-put-string.md').then(() => {
            return sftp.get(BASIC_URL + 'mocha-put-string.md');
        }).then((list) => {
            return expect(list).to.not.empty;
        });
    });

    it('put buffer file', () => {
        let str = new Buffer('hello');

        return sftp.put(str, BASIC_URL + 'mocha-put-buffer.md').then(() => {
            return sftp.get(BASIC_URL + 'mocha-put-buffer.md');
        }).then((data) => {
            return expect(data).to.not.empty;
        });
    });

    it('put stream file', () => {
        var str2 = new stream.Readable();
        str2._read = function noop() {};
        str2.push('your text here');
        str2.push(null);

        return sftp.put(str2, BASIC_URL + 'mocha-put-stream.md').then(() => {
            return sftp.get(BASIC_URL + 'mocha-put-stream.md');
        }).then((data) => {
            return expect(data).to.not.empty;
        });
    });
});

describe('mkdir', () => {
    chai.use(chaiSubset);

    before(() => {
        return sftp.connect(config, 'once');
    });
    after(() => {
        return sftp.rmdir(BASIC_URL + 'mocha', true).then(() => {
            return sftp.end();
        });
    });

    it('return should be a promise', () => {
        return expect(sftp.mkdir(BASIC_URL + 'mocha')).to.be.a('promise');
    });

    it('mkdir', () => {
        return sftp.mkdir(BASIC_URL + 'mocha3/mm').catch((err) => {
            return expect(err.toString()).to.contain('Error');
        });
    });

    it('mkdir force', () => {
        return sftp.mkdir(BASIC_URL + 'mocha/mocha-dir-force', true).then(() => {
            return sftp.list(BASIC_URL + 'mocha');
        }).then((list) => {
            return expect(list).to.containSubset([{'name': 'mocha-dir-force'}]);
        });
    });
});

describe('rmdir', () => {
    chai.use(chaiSubset);

    // beforeEach(() => {
    //     return sftp.connect(config, 'once');
    // });
    before(() => {
        return sftp.connect(config, 'once').then(() => {
            return sftp.mkdir(BASIC_URL + 'mocha-rmdir/dir1', true);
        }).then(() => {
            return sftp.mkdir(BASIC_URL + 'mocha-rmdir/dir2', true);
        }).then(() => {
            return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-rmdir/file1.md', true);
        });
    });
    // afterEach(() => {
    //     return sftp.end();
    // });

    it('return should be a promise', () => {
        return expect(sftp.rmdir(BASIC_URL + 'mocha')).to.be.a('promise');
    });

    it('remove directory is not exisit', () => {
        return sftp.rmdir(BASIC_URL + 'mocha-rmdir2', true).catch((err) => {
            return expect(err.toString()).to.contain('Error');
        });
    });

    it('remove directory without recursive', () => {
        return sftp.rmdir(BASIC_URL + 'mocha-rmdir').catch((err) => {
            return expect(err.toString()).to.contain('Error');
        });
    });

    it('remove directory recursive', () => {
        return sftp.connect(config, 'once').then(() => {
            sftp.rmdir(BASIC_URL + 'mocha-rmdir', true).then(() => {
                return sftp.list(BASIC_URL);
            }).then((list) => {
                return expect(list).to.not.containSubset([{'name': 'mocha-rmdir'}]);
            });
        });
    });
});

describe('delete', () => {
    chai.use(chaiSubset);

    before(() => {
        return sftp.connect(config, 'once').then(() => {
            sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-delete.md', true);
        });
    });
    after(() => {
        return sftp.end();
    });

    it('return should be a promise', () => {
        return expect(sftp.delete(BASIC_URL + 'mocha')).to.be.a('promise');
    });

    it('delete single file test', () => {
        sftp.delete(BASIC_URL + 'mocha-delete.md').then(() => {
            return sftp.list(BASIC_URL);
        }).then((list) => {
            return expect(list).to.not.containSubset([{'name': 'mocha-delete.md'}]);
        });
    });
});

describe('rename', () => {
    chai.use(chaiSubset);

    before(() => {
        return sftp.connect(config, 'once').then(() => {
            return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-rename.md', true);
        });
    });
    after(() => {
        return sftp.delete(BASIC_URL + 'mocha-rename-new.md').then(() => {
            sftp.end();
        });
    });

    it('return should be a promise', () => {
        return expect(sftp.rename(BASIC_URL + 'mocha1', BASIC_URL + 'mocha')).to.be.a('promise');
    });

    it('rename file', () => {
        return sftp.rename(BASIC_URL + 'mocha-rename.md', BASIC_URL + 'mocha-rename-new.md').then(() => {
            return sftp.list(BASIC_URL);
        }).then((list) => {
            return expect(list).to.containSubset([{'name': 'mocha-rename-new.md'}]);
        });
    });
});

describe('getOptions', () => {

    it('encoding should be utf8 if undefined', () => {
        return expect(sftp.getOptions()).to.have.property('encoding', 'utf8')
    });

    it('encoding should be utf8 if undefined 1', () => {
        return expect(sftp.getOptions(false)).to.have.property('encoding', 'utf8')
    });

    it('encoding should be utf8 if undefined 2', () => {
        return expect(sftp.getOptions(false, undefined)).to.have.property('encoding', 'utf8')
    });

    it('encoding should be null if null', () => {
        return expect(sftp.getOptions(false, null)).to.have.property('encoding', null)
    });

    it('encoding should be hex', () => {
        return expect(sftp.getOptions(false, 'hex')).to.have.property('encoding', 'hex')
    });
});

describe('chmod', () => {
    chai.use(chaiSubset);

    before(() => {
        return sftp.connect(config, 'once').then(() => {
            return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-chmod.txt', true);
        });
    });
    after(() => {
        return sftp.delete(BASIC_URL + 'mocha-chmod.txt').then(() => {
            sftp.end();
        });
    });

    it('return should be a promise', () => {
        return expect(sftp.chmod(BASIC_URL + 'mocha-chmod.txt', 0777)).to.be.a('promise');
    });

    it('chmod file', () => {
        return sftp.chmod(BASIC_URL + 'mocha-chmod.txt', 0777).then(() => {
            return sftp.list(BASIC_URL);
        }).then((list) => {
            return expect(list).to.containSubset([{'name': 'mocha-chmod.txt', 'rights': { 'user': 'rwx', 'group': 'rwx', 'other': 'rwx' }}]);
        });
    });
});

// describe('event', () => {
//     chai.use(chaiSubset);
//     before(() => {
//         return sftp.connect(config, 'once');
//     })

//     it('it should be trigger end event', () => {
//         sftp.on('end', () => {
//             return expect('ok')
//         })
//         sftp.end();
//     })
// });
