const stream = require('stream');
const chai = require('chai');
const path = require('path');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const Client = require('../src/index.js');
const fs = require("fs");

chai.use(chaiSubset);
chai.use(chaiAsPromised);


const sftp = new Client();
const hookSftp = new Client();

// use your test ssh server config
const config = {
  host: 'xxxx',
  username: 'yyyyy',
  password: 'zzzz'
};

//const BASIC_URL = path.resolve(__dirname, '../testServer/') + '/';

const BASIC_URL = '/home/tcross8/testServer/';

before(() => {
  return sftp.connect(config, 'once')
    .catch(err => {
      throw new Error(`Global before all hook error: ${err.message}`);
    });
});

after(() => {
  return sftp.end()
    .catch(err => {
      throw new Error(`Global after all hook error: ${err.message}`);
    });
});

describe('list', () => {
  chai.use(chaiSubset);

  before(function() {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.mkdir(BASIC_URL + 'mocha-list/dir1', true);
      })
      .then(() => {
        return hookSftp.mkdir(BASIC_URL + 'mocha-list/dir2/sub1', true);
      })
      .then(() => {
        return hookSftp.put(new Buffer('hello file1'), BASIC_URL + 'mocha-list/file1.html', true);
      })
      .then(() => {
        return hookSftp.put(new Buffer('hello file2'), BASIC_URL + 'mocha-list/file2.md', true);
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });
  
  after(function() {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.rmdir(BASIC_URL + 'mocha-list', true);
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  // don't use arrow functions as it screws with the context, which
  // causes issues with chai
  it('list return should be a promise', function() {
    return expect(sftp.list(BASIC_URL + 'mocha-list')).to.be.a('promise');
  });
  it('list return should be empty', function() {
    return expect(sftp.list(BASIC_URL + 'mocha-list/empty')).to.be.rejectedWith('No such file');
  });
  it('should return the list name of each', function() {
    return sftp.list(BASIC_URL + 'mocha-list')
      .then(list => {
        return expect(list).to.containSubset([
          {'name': 'dir1'},
          {'name': 'dir2'},
          {'name': 'file1.html'},
          {'name': 'file2.md'}
        ]);
      });
  });
  it('should return the list name of each', async function() {
    let list = await sftp.list(BASIC_URL + 'mocha-list');
    return expect(list).to.containSubset([
      {'name': 'dir1'},
      {'name': 'dir2'},
      {'name': 'file1.html'},
      {'name': 'file2.md'}
    ]);
  });
});

describe('stat', function() {
  chai.use(chaiSubset);

  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.put(new Buffer('hello'), BASIC_URL + 'mocha-stat.md', {mode: 0o777});
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });

  after(() => {
    return hookSftp.delete(BASIC_URL + 'mocha-stat.md')
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.stat(BASIC_URL + 'mocha-stat.md')).to.be.a('promise');
  });
  it('get the file stats', async function() {
    let stats = await sftp.stat(BASIC_URL + 'mocha-stat.md');
    return expect(stats).to.containSubset({mode: 33279});
  });
  it('stat file faild', function() {
    return expect(sftp.stat(BASIC_URL + 'mocha-stat1.md')).to.be.rejectedWith('No such file');
  });
});

describe('get', function() {
  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.put(new Buffer('hello'), BASIC_URL + 'mocha-file.md', true);
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });

  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.delete(BASIC_URL + 'mocha-file.md');
      })
      .then(() => {
        return hookSftp.end();
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.get(BASIC_URL + 'mocha-file.md')).to.be.a('promise');
  });
  it('get the file content', function() {
    return sftp.get(BASIC_URL + 'mocha-file.md')
      .then((data) => {
        let body;
        data.on('data', (chunk) => {
          body += chunk;
        });
        data.on('end', () => {
          expect(body).to.equal('hello');
        });
      });
  });
  it('get file faild', function() {
    return expect(sftp.get(BASIC_URL + 'mocha-file1.md')).to.be.rejectedWith('No such file');
  });
});

// describe('fast get', function() {
//   chai.use(chaiSubset);
//   before(() => {
//     return sftp.connect(config, 'once').then(() => {
//       return sftp.put(new Buffer('fast get'), BASIC_URL + 'mocha-fastget.md', true);
//     });
//   });
//   after(() => {
//     return sftp.connect(config, 'once').then(async function () {
//       await sftp.delete(BASIC_URL + 'mocha-fastget.md');
//       await sftp.delete(BASIC_URL + 'local.md');
//       return sftp;
//     }).then(() => {
//       return sftp.end();
//     });
//   });

//   it('get file content', function() {
//     console.log('get file content')
//     return sftp.fastGet(BASIC_URL + 'mocha-fastget.md', BASIC_URL + 'local.md').then(() => {
//       return sftp.get(BASIC_URL + 'local.md')
//     }).then((data) => {
//       let body;
//       data.on('data', (chunk) => {
//         body += chunk;
//       });
//       data.on('end', () => {
//         expect(body).to.equal('fast get');
//       });
//     });
//   });
// });

// describe('put', function() {
//   before(() => {
//     return sftp.connect(config, 'once');
//   });
//   after(() => {
//     return sftp.delete(BASIC_URL + 'mocha-put-string.md').then(() => {
//       return sftp.delete(BASIC_URL + 'mocha-put-buffer.md');
//     }).then(() => {
//       return sftp.delete(BASIC_URL + 'mocha-put-stream.md');
//     }).then(() => {
//       return sftp.end();
//     });
//   });

//   it('return should be a promise', function() {
//     return expect(sftp.put(new Buffer(''), BASIC_URL + 'mocha-put-buffer.md')).to.be.a('promise');
//   });

//   it('put local path file', function() {
//     let path = __dirname + '/mocha.opts';
//     return sftp.put(path, BASIC_URL + 'mocha-put-string.md').then(() => {
//       return sftp.get(BASIC_URL + 'mocha-put-string.md');
//     }).then((list) => {
//       return expect(list).to.not.empty;
//     });
//   });

//   it('put buffer file', function() {
//     let str = new Buffer('hello');

//     return sftp.put(str, BASIC_URL + 'mocha-put-buffer.md').then(() => {
//       return sftp.get(BASIC_URL + 'mocha-put-buffer.md');
//     }).then((data) => {
//       return expect(data).to.not.empty;
//     });
//   });

//   it('put stream file', function() {
//     var str2 = new stream.Readable();
//     str2._read = function noop() {};
//     str2.push('your text here');
//     str2.push(null);
    
//     return sftp.put(str2, BASIC_URL + 'mocha-put-stream.md').then(() => {
//       return sftp.get(BASIC_URL + 'mocha-put-stream.md');
//     }).then((data) => {
//       return expect(data).to.not.empty;
//     });
//   });
// });

// describe('fast put', function() {
//   before(() => {
//     return sftp.connect(config, 'once').then(() => {
//       return sftp.put(new Buffer('fast put'), BASIC_URL + 'mocha-fastput.md', true);
//     })
//   });
//   after(() => {
//     return sftp.connect(config, 'once').then(async function() {
//       await sftp.delete(BASIC_URL + 'mocha-fastput.md');
//       await sftp.delete(BASIC_URL + 'remote.md');
//       return sftp;
//     }).then(() => {
//       return sftp.end();
//     });
//   });

//   it('fastput file', function() {
//     return sftp.fastGet(BASIC_URL + 'mocha-fastput.md', BASIC_URL + 'remote.md').then(() => {
//       return sftp.get(BASIC_URL + 'remote.md')
//     }).then((data) => {
//       let body;
//       data.on('data', (chunk) => {
//         body += chunk;
//       });
//       data.on('end', () => {
//         expect(body).to.equal('fast put');
//       });
//     });
//   });
// });

// describe('mkdir', function() {
//   chai.use(chaiSubset);

//   before(() => {
//     return sftp.connect(config, 'once');
//   });
//   after(() => {
//     return sftp.rmdir(BASIC_URL + 'mocha', true).then(() => {
//       return sftp.end();
//     });
//   });

//   it('return should be a promise', function() {
//     return expect(sftp.mkdir(BASIC_URL + 'mocha')).to.be.a('promise');
//   });

//   it('mkdir', function() {
//     return sftp.mkdir(BASIC_URL + 'mocha3/mm').catch((err) => {
//       return expect(err.toString()).to.contain('Error');
//     });
//   });

//   it('mkdir force', function() {
//     return sftp.mkdir(BASIC_URL + 'mocha/mocha-dir-force', true).then(() => {
//       return sftp.list(BASIC_URL + 'mocha');
//     }).then((list) => {
//       return expect(list).to.containSubset([{'name': 'mocha-dir-force'}]);
//     });
//   });
// });

// describe('rmdir', function() {
//   chai.use(chaiSubset);

//     // beforeEach(() => {
//     //     return sftp.connect(config, 'once');
//     // });
//   before(() => {
//     return sftp.connect(config, 'once').then(() => {
//       return sftp.mkdir(BASIC_URL + 'mocha-rmdir/dir1', true);
//     }).then(() => {
//       return sftp.mkdir(BASIC_URL + 'mocha-rmdir/dir2', true);
//     }).then(() => {
//       return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-rmdir/file1.md', true);
//     })
//       .catch(err => {
//         console.log(err.message);
//       });
//   });
//   // afterEach(() => {
//   //     return sftp.end();
//   // });

//   it('return should be a promise', function() {
//     return expect(sftp.rmdir(BASIC_URL + 'mocha').catch(err => undefined)).to.be.a('promise');
//   });

//   it('remove directory is not exisit', function() {
//     return sftp.rmdir(BASIC_URL + 'mocha-rmdir2', true).catch((err) => {
//       return expect(err.toString()).to.contain('Error');
//     });
//   });

//   it('remove directory without recursive', function() {
//     return sftp.rmdir(BASIC_URL + 'mocha-rmdir').catch((err) => {
//       return expect(err.toString()).to.contain('Error');
//     });
//   });

//   it('remove directory recursive', function() {
//     return sftp.connect(config, 'once').then(() => {
//       sftp.rmdir(BASIC_URL + 'mocha-rmdir', true).then(() => {
//         return sftp.list(BASIC_URL);
//       }).then((list) => {
//         return expect(list).to.not.containSubset([{'name': 'mocha-rmdir'}]);
//       });
//     });
//   });
// });

// describe('delete', function() {
//   chai.use(chaiSubset);

//   before(() => {
//     return sftp.connect(config, 'once').then(() => {
//       sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-delete.md', true);
//     }).catch(err => {
//       console.error(err.message);
//     });
//   });
//   after(() => {
//     return sftp.end();
//   });

//   it('return should be a promise', function() {
//     return expect(sftp.delete(BASIC_URL + 'mocha').catch(err => undefined)).to.be.a('promise');
//   });

//   it('delete single file test', function() {
//     sftp.delete(BASIC_URL + 'mocha-delete.md').then(() => {
//       return sftp.list(BASIC_URL);
//     }).then((list) => {
//       return expect(list).to.not.containSubset([{'name': 'mocha-delete.md'}]);
//     });
//   });
// });

// describe('rename', function() {
//   chai.use(chaiSubset);

//   before(() => {
//     return sftp.connect(config, 'once').then(() => {
//       return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-rename.md', true);
//     }).catch(err => {
//       console.error(err.message);
//     });
//   });
//   after(() => {
//     return sftp.delete(BASIC_URL + 'mocha-rename-new.md').then(() => {
//       sftp.end();
//     }).catch(err => {
//       console.error(err.message);
//     });
//   });

//   it('return should be a promise', function() {
//     return expect(sftp.rename(BASIC_URL + 'mocha1', BASIC_URL + 'mocha').catch(e => undefined)).to.be.a('promise');
//   });

//   it('rename file', function() {
//     return sftp.rename(BASIC_URL + 'mocha-rename.md', BASIC_URL + 'mocha-rename-new.md').then(() => {
//       return sftp.list(BASIC_URL);
//     }).then((list) => {
//       return expect(list).to.containSubset([{'name': 'mocha-rename-new.md'}]);
//     }).catch(err => {
//       console.error(err.message);
//     });
//   });
// });

// describe('getOptions', function() {

//   it('encoding should be utf8 if undefined', function() {
//     return expect(sftp.getOptions()).to.have.property('encoding', 'utf8');
//   });

//   it('encoding should be utf8 if undefined 1', function() {
//     return expect(sftp.getOptions(false)).to.have.property('encoding', 'utf8');
//   });

//   it('encoding should be utf8 if undefined 2', function() {
//     return expect(sftp.getOptions(false, undefined)).to.have.property('encoding', 'utf8');
//   });

//   it('encoding should be null if null', function() {
//     return expect(sftp.getOptions(false, null)).to.have.property('encoding', null);
//   });

//   it('encoding should be hex', function() {
//     return expect(sftp.getOptions(false, 'hex')).to.have.property('encoding', 'hex');
//   });
// });

// describe('chmod', function() {
//   chai.use(chaiSubset);

//   before(() => {
//     return sftp.connect(config, 'once').then(() => {
//       return sftp.put(new Buffer('hello'), BASIC_URL + 'mocha-chmod.txt', true);
//     });
//   });
//   after(() => {
//     return sftp.delete(BASIC_URL + 'mocha-chmod.txt').then(() => {
//       sftp.end();
//     });
//   });

//   it('return should be a promise', function() {
//     return expect(sftp.chmod(BASIC_URL + 'mocha-chmod.txt', 0777)).to.be.a('promise');
//   });

//   it('chmod file', function() {
//     return sftp.chmod(BASIC_URL + 'mocha-chmod.txt', 0777).then(() => {
//       return sftp.list(BASIC_URL);
//     }).then((list) => {
//       return expect(list).to.containSubset([{'name': 'mocha-chmod.txt', 'rights': { 'user': 'rwx', 'group': 'rwx', 'other': 'rwx' }}]);
//     });
//   });
// });

// // describe('event', () => {
// //     chai.use(chaiSubset);
// //     before(() => {
// //         return sftp.connect(config, 'once');
// //     })

// //     it('it should be trigger end event', () => {
// //         sftp.on('end', () => {
// //             return expect('ok')
// //         })
// //         sftp.end();
// //     })
// // });
