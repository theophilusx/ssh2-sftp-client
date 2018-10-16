'use strict';

const dotenvPath = __dirname + '/../.env';

require('dotenv').config({path: dotenvPath});

const stream = require('stream');
const chai = require('chai');
const path = require('path');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const Client = require('../src/index.js');
const fs = require('fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

// Using separate openssh sftp server rather than server
// provided by ssh2 module to ensure compatibility with
// general sftp server
const SFTP_URL = process.env['SFTP_URL'];

// Extending tests for put/get with larger data sets, so
// maintain directory of test data (including binary files). 
const LOCAL_URL = path.join(__dirname, 'testData');


const sftp = new Client();
const hookSftp = new Client();

// use your test ssh server config
const config = {
  host: process.env['SFTP_SERVER'],
  username: process.env['SFTP_USER'],
  password: process.env['SFTP_PASSWORD']
};

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
  // should really be using something other than ssh2-sftp-client to setup
  // and tear down testing environment. 
  before(function() {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha-list/dir1'), true);
      })
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha-list/dir2/sub1'), true);
      })
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha-list/empty'), true);
      })
      .then(() => {
        return hookSftp.put(new Buffer('hello file1'), path.join(SFTP_URL, 'mocha-list/file1.html'), true);
      })
      .then(() => {
        return hookSftp.put(new Buffer('hello file2'), path.join(SFTP_URL, 'mocha-list/file2.md'), true);
      })
      .then(() => {
        return hookSftp.fastPut(
          path.join(LOCAL_URL, 'test-file1.txt'),
          path.join(SFTP_URL, 'mocha-list/test-file1.txt')
        );
      })
      .then(() => {
        return hookSftp.fastPut(
          path.join(LOCAL_URL, 'test-file2.txt.gz'),
          path.join(SFTP_URL, 'mocha-list/test-file2.txt.gz')
        );
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
        return hookSftp.rmdir(path.join(SFTP_URL, 'mocha-list'), true);
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
    return expect(sftp.list(path.join(SFTP_URL, 'mocha-list'))).to.be.a('promise');
  });

  it('list return should be empty', function() {
    return expect(sftp.list(path.join(SFTP_URL, 'mocha-list/empty'))).to.become([]);
  });

  it('list non-existent directory', function() {
    return expect(sftp.list(path.join(SFTP_URL, 'mocha-list/not-exist'))).to.be.rejectedWith('No such file');
  });

  it('should return the list name of each', async function() {
    let list = await sftp.list(path.join(SFTP_URL, 'mocha-list'));
    return expect(list).to.containSubset([
      {'type': 'd', 'name': 'dir1'},
      {'type': 'd', 'name': 'dir2'},
      {'type': 'd', 'name': 'empty'},
      {'type': '-', 'name': 'file1.html', 'size': 11},
      {'type': '-', 'name': 'file2.md', 'size': 11},
      {'type': '-', 'name': 'test-file1.txt', 'size': 3235},
      {'type': '-', 'name': 'test-file2.txt.gz', 'size': 646}
    ]);
  });
});

describe('stat', function() {

  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.put(new Buffer('hello'), path.join(SFTP_URL, 'mocha-stat.md'), {mode: 0o777});
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });

  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-stat.md'));
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.stat(path.join(SFTP_URL, 'mocha-stat.md'))).to.be.a('promise');
  });

  it('get the file stats for existing file', async function() {
    let stats = await sftp.stat(path.join(SFTP_URL, 'mocha-stat.md'));
    return expect(stats).to.containSubset({mode: 33279, size: 5});
  });

  it('stat on non-existent file fails', function() {
    return expect(sftp.stat(path.join(SFTP_URL, 'mocha-stat1.md'))).to.be.rejectedWith('No such file');
  });
});

describe('get', function() {
  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.put(new Buffer('hello'), path.join(SFTP_URL, 'mocha-file.md'), true);
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });

  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-file.md'));
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.get(path.join(SFTP_URL, 'mocha-file.md'))).to.be.a('promise');
  });

  it('get the file content', function() {
    return sftp.get(path.join(SFTP_URL, 'mocha-file.md'))
      .then((data) => {
        let body;
        data.on('data', (chunk) => {
          body += chunk;
        });
        data.on('end', () => {
          return expect(body).to.equal('hello');
        });
      });
  });

  it('get file faild', function() {
    return expect(sftp.get(path.join(SFTP_URL, 'mocha-file-not-exist.md'))).to.be.rejectedWith('No such file');
  });
});

describe('fast get', function() {
  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.put(new Buffer('fast get'), path.join(SFTP_URL, 'mocha-fastget1.md'), true);
      })
      .then(() => {
        return hookSftp.fastPut(
          path.join(LOCAL_URL, 'test-file1.txt'),
          path.join(SFTP_URL, 'mocha-fastget2.txt')
        );
      })
      .then(() => {
        return hookSftp.fastPut(
          path.join(LOCAL_URL, 'test-file2.txt.gz'),
          path.join(SFTP_URL, 'mocha-fastget3.txt.gz')
        );
      })
      .then(() => {
        return fs.mkdirSync(path.join(LOCAL_URL, 'fastGet'));
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });
  
  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-fastget1.md'));
      })
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-fastget2.txt'));
      })
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-fastget3.txt.gz'));
      })
      .then(() => {
        fs.unlinkSync(path.join(LOCAL_URL, 'fastGet', 'local1.md'));
        fs.unlinkSync(path.join(LOCAL_URL, 'fastGet', 'local2.txt'));
        fs.unlinkSync(path.join(LOCAL_URL, 'fastGet', 'local3.txt.gz'));
        return fs.rmdirSync(path.join(LOCAL_URL, 'fastGet'));
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('get file 1', function() {
    return sftp.fastGet(
      path.join(SFTP_URL, 'mocha-fastget1.md'),
      path.join(LOCAL_URL, 'fastGet', 'local1.md')
    )
      .then(() => {
        return expect(fs.statSync(path.join(LOCAL_URL, 'fastGet', 'local1.md'))).to.containSubset({size: 8});
      });
  });

  it('get file 2', function() {
    return sftp.fastGet(
      path.join(SFTP_URL, 'mocha-fastget2.txt'),
      path.join(LOCAL_URL, 'fastGet', 'local2.txt')
    )
      .then(() => {
        return expect(fs.statSync(path.join(LOCAL_URL, 'fastGet', 'local2.txt'))).to.containSubset({size: 3235});
      });
  });

  it('get file 3', function() {
    return sftp.fastGet(
      path.join(SFTP_URL, 'mocha-fastget3.txt.gz'),
      path.join(LOCAL_URL, 'fastGet', 'local3.txt.gz')
    )
      .then(() => {
        return expect(fs.statSync(path.join(LOCAL_URL, 'fastGet', 'local3.txt.gz'))).to.containSubset({size: 646});
      });
  });

  it('get on non-existent file fails', function() {
    return expect(sftp.fastGet(
      path.join(SFTP_URL, 'mocha-fastget-not-exist.txt'),
      path.join(LOCAL_URL, 'fastGet', 'not-exist.txt')
    )).to.be.rejectedWith('No such file');
  });
});

describe('put', function() {
  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-put-string.md'));
      })
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-put-buffer.md'));
      }).then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'mocha-put-stream.md'));
      }).then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.put(new Buffer(''), path.join(SFTP_URL, 'mocha-put-buffer.md'))).to.be.a('promise');
  });

  it('put local path file', function() {
    return sftp.put(path.join(LOCAL_URL, 'test-file1.txt'), path.join(SFTP_URL, 'mocha-put-string.md'))
      .then(() => {
        return sftp.stat(path.join(SFTP_URL, 'mocha-put-string.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 3235});
      });
  });

  it('put buffer file', function() {
    return sftp.put(new Buffer('hello'), path.join(SFTP_URL, 'mocha-put-buffer.md'))
      .then(() => {
        return sftp.stat(path.join(SFTP_URL, 'mocha-put-buffer.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('put stream file', function() {
    var str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);
    
    return sftp.put(str2, path.join(SFTP_URL, 'mocha-put-stream.md'))
      .then(() => {
        return sftp.stat(path.join(SFTP_URL, 'mocha-put-stream.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 14});
      });
  });

  it('Put with no src file', function() {
    return expect(sftp.put(
      path.join(LOCAL_URL, 'no-such-file.txt'),
      path.join(SFTP_URL, 'mocha-put-no-file.txt')
    )).to.be.rejectedWith('Failed to upload');
  });

  it('Put with bad dst path', function() {
    return expect(sftp.put(
      path.join(LOCAL_URL, 'test-file1.txt'),
      path.join(SFTP_URL, 'bad-directory', 'bad-file.txt')
    )).to.be.rejectedWith('Failed to upload');
  });
});

describe('fast put', function() {
  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.put(new Buffer('fast put'), path.join(SFTP_URL, 'mocha-fastput.md'), true);
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });
  
  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'remote2.md.gz'));
      })
      .then(() => {
        return hookSftp.delete(path.join(SFTP_URL, 'remote.md'));
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('fastput file 1', function() {
    return sftp.fastPut(
      path.join(LOCAL_URL, 'test-file1.txt'),
      path.join(SFTP_URL, 'remote.md'))
      .then(() => {
        return sftp.stat(path.join(SFTP_URL, 'remote.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 3235});
      });
  });

  it('fastput file 2', function() {
    return sftp.fastPut(
      path.join(LOCAL_URL, 'test-file2.txt.gz'),
      path.join(SFTP_URL, 'remote2.md.gz'))
      .then(() => {
        return sftp.stat(path.join(SFTP_URL, 'remote2.md.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 646});
      });
  });

  it('fastput with bad src', function() {
    return expect(sftp.fastPut(
      path.join(LOCAL_URL, 'file-not-exist.txt'),
      path.join(SFTP_URL, 'fastput-error.txt')
    )).to.rejectedWith('Failed to upload');
  });

  it('fastput with bad dst', function() {
    return expect(sftp.fastPut(
      path.join(LOCAL_URL, 'test-file1.txt'),
      path.join(SFTP_URL, 'non-existent-dir', 'fastput-error.txt')
    )).to.rejectedWith('Failed to upload');
  });
});

describe('mkdir', function() {
  before(() => {
    return hookSftp.connect(config, 'once');
  });
  after(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.rmdir(path.join(SFTP_URL, 'mocha'), true);
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`After all hook error: ${err.message}`);
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.mkdir(path.join(SFTP_URL, 'mocha'))).to.be.a('promise');
  });

  it('mkdir with bad path', function() {
    return expect(sftp.mkdir(path.join(SFTP_URL, 'mocha3/mm')))
      .to.be.rejectedWith('Failed to create directory');
  });

  it('mkdir force', function() {
    return sftp.mkdir(path.join(SFTP_URL, 'mocha/mocha-dir-force'), true)
      .then(() => {
        return sftp.list(path.join(SFTP_URL, 'mocha'));
      }).then(list => {
        return expect(list).to.containSubset([{'name': 'mocha-dir-force'}]);
      });
  });
});

describe('rmdir', function() {
  before(() => {
    return hookSftp.connect(config, 'once')
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha'));
      })
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha-rmdir/dir1'), true);
      })
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha-rmdir/dir2'), true);
      })
      .then(() => {
        return hookSftp.mkdir(path.join(SFTP_URL, 'mocha-rmdir/dir3/subdir'), true);
      })
      .then(() => {
        return hookSftp.put(new Buffer('hello'), path.join(SFTP_URL, 'mocha-rmdir/file1.md'), true);
      })
      .then(() => {
        return hookSftp.end();
      })
      .catch(err => {
        throw new Error(`Before all hook error: ${err.message}`);
      });
  });

  it('return should be a promise', function() {
    return expect(sftp.rmdir(path.join(SFTP_URL, 'mocha'))).to.be.a('promise');
  });

  it('rmdir directory not exisit', function() {
    return expect(sftp.rmdir(path.join(SFTP_URL, 'mocha-rmdir2'), true))
      .to.be.rejectedWith('No such file');
  });

  it('remove directory without recursion', function() {
    return expect(sftp.rmdir(path.join(SFTP_URL, 'mocha-rmdir', 'dir1')))
      .to.eventually.equal('Successfully removed directory');
  });

  it('remove directory recursively', function() {
    return expect(sftp.rmdir(path.join(SFTP_URL, 'mocha-rmdir', 'dir3'), true))
      .to.eventually.equal('Successfully removed directory');
  });

  it('remove dir and file recursively', function() {
    return expect(sftp.rmdir(path.join(SFTP_URL, 'mocha-rmdir'), true))
      .to.eventually.equal('Successfully removed directory');
  });
});

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
