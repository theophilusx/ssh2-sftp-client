'use strict';

// smaller utility method tests

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const lHooks = require('./hooks/list-hooks');
const eHooks = require('./hooks/exist-hooks');
const sHooks = require('./hooks/stat-hooks');
const mHooks = require('./hooks/mkdir-hooks');
const rHooks = require('./hooks/rmdir-hooks');
const dHooks = require('./hooks/delete-hooks');
const cHooks = require('./hooks/chmod-hooks');
const rnHooks = require('./hooks/rename-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

let hookSftp, sftp, sftpUrl, localUrl;

before('Global setup', function() {
  return gHooks
    .setup()
    .then(testEnv => {
      hookSftp = testEnv.hookSftp;
      sftp = testEnv.sftp;
      sftpUrl = testEnv.sftpUrl;
      localUrl = testEnv.localUrl;
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

after('Global shutdown', function() {
  return gHooks
    .closeDown()
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

describe('list method tests', () => {
  before('List test setup hook', function() {
    return lHooks.listSetup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('List test cleanup hook', function() {
    return lHooks.listCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  // don't use arrow functions as it screws with the context, which
  // causes issues with chai
  it('list return should be a promise', function() {
    return expect(sftp.list(join(sftpUrl, 'mocha-list'))).to.be.a('promise');
  });

  it('list return on empty directory should be empty', function() {
    return expect(sftp.list(join(sftpUrl, 'mocha-list/empty'))).to.become([]);
  });

  it('list non-existent directory rejected', function() {
    return expect(
      sftp.list(join(sftpUrl, 'mocha-list/not-exist'))
    ).to.be.rejectedWith('No such file');
  });

  it('list existing dir returns details of each entry', async function() {
    let list = await sftp.list(join(sftpUrl, 'mocha-list'));
    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html', size: 11},
      {type: '-', name: 'file2.md', size: 11},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });
});

describe('Exist method tests', function() {
  before('Exist test setup hook', function() {
    return eHooks.existSetup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('Exist test cleanup hook', function() {
    return eHooks.existCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Exist return should be a promise', function() {
    return expect(sftp.exists(sftpUrl)).to.be.a('promise');
  });

  it('Exist returns truthy for existing directory', function() {
    return expect(sftp.exists(join(sftpUrl, 'exist-dir'))).to.eventually.equal(
      'd'
    );
  });

  it('Exist returns truthy for existing file', function() {
    return expect(
      sftp.exists(join(sftpUrl, 'exist-file.txt'))
    ).to.eventually.equal('-');
  });

  it('Exists return false value for non existent object', function() {
    return expect(
      sftp.exists(join(sftpUrl, 'no-such-dir/subdir'))
    ).to.eventually.equal(false);
  });

  it('Exists return false for bad path', function() {
    return expect(sftp.exists('just/a/really/bad/path')).to.eventually.equal(
      false
    );
  });
});

describe('Stat method tests', function() {
  before(() => {
    return sHooks.statSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after(() => {
    return sHooks.statCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Stat return should be a promise', function() {
    return expect(sftp.stat(join(sftpUrl, 'mocha-stat.md'))).to.be.a('promise');
  });

  it('Stat on existing file returns stat data', async function() {
    let stats = await sftp.stat(join(sftpUrl, 'mocha-stat.md'));
    return expect(stats).to.containSubset({mode: 33279, size: 5});
  });

  it('Stat on non-existent file rejected', function() {
    return expect(
      sftp.stat(join(sftpUrl, 'mocha-stat1.md'))
    ).to.be.rejectedWith('No such file');
  });
});

describe('Mkdir method tests', function() {
  after('Mkdir test cleanup', function() {
    return mHooks.mkdirCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Mkdir should return a promise', function() {
    return expect(sftp.mkdir(join(sftpUrl, 'mocha'))).to.be.a('promise');
  });

  it('Mkdir without recursive option and bad path should be rejected', function() {
    return expect(sftp.mkdir(join(sftpUrl, 'mocha3', 'mm'))).to.be.rejectedWith(
      'Failed to create directory'
    );
  });

  it('Mkdir with recursive option should create all directories', function() {
    return sftp
      .mkdir(join(sftpUrl, 'mocha', 'mocha-dir-force', 'subdir'), true)
      .then(() => {
        return sftp.list(join(sftpUrl, 'mocha', 'mocha-dir-force'));
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'subdir'}]);
      });
  });

  it('mkdir without recursive option creates dir', function() {
    return sftp
      .mkdir(join(sftpUrl, 'mocha', 'mocha-non-recursive'), false)
      .then(() => {
        return sftp.list(join(sftpUrl, 'mocha'));
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'mocha-non-recursive'}]);
      });
  });
});

describe('Rmdir method tests', function() {
  before('Rmdir method setup hook', function() {
    return rHooks.rmdirSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Rmdir should return a promise', function() {
    return expect(sftp.rmdir(join(sftpUrl, 'mocha'))).to.be.a('promise');
  });

  it('Rmdir on non-existent directory should be rejected', function() {
    return expect(
      sftp.rmdir(join(sftpUrl, 'mocha-rmdir2'), true)
    ).to.be.rejectedWith('No such file');
  });

  it('Rmdir without recursion on empty directory', function() {
    return expect(
      sftp.rmdir(join(sftpUrl, 'mocha-rmdir', 'dir1'))
    ).to.eventually.equal('Successfully removed directory');
  });

  it('Rmdirrecursively remove all directories', function() {
    return expect(
      sftp.rmdir(join(sftpUrl, 'mocha-rmdir', 'dir3'), true)
    ).to.eventually.equal('Successfully removed directory');
  });

  it('Rmdir recursively remove dirs and files', function() {
    return expect(
      sftp.rmdir(join(sftpUrl, 'mocha-rmdir'), true)
    ).to.eventually.equal('Successfully removed directory');
  });
});

describe('Delete method tests', function() {
  before('Delete tests setup hook', function() {
    return dHooks.deleteSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Delete returns a promise', function() {
    return expect(
      sftp.delete(join(sftpUrl, 'mocha-delete-promise.md'))
    ).to.be.a('promise');
  });

  it('Delete a file', function() {
    return expect(
      sftp.delete(join(sftpUrl, 'mocha-delete.md'))
    ).to.eventually.equal('Successfully deleted file');
  });

  it('Delete non-existent file is rejected', function() {
    return expect(
      sftp.delete(join(sftpUrl, 'no-such-file.txt'))
    ).to.be.rejectedWith('Failed to delete file');
  });
});

describe('Rename method tests', function() {
  before('Rename setup hook', function() {
    return rnHooks.renameSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('Rename cleanup hook', function() {
    return rnHooks.renameCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Rename should return a promise', function() {
    return expect(
      sftp.rename(
        join(sftpUrl, 'mocha-rename.md'),
        join(sftpUrl, 'mocha-rename.txt')
      )
    ).to.be.a('promise');
  });

  it('Rename file successfully', function() {
    return sftp
      .rename(
        join(sftpUrl, 'mocha-rename.txt'),
        join(sftpUrl, 'mocha-rename-new.md')
      )
      .then(() => {
        return sftp.list(sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'mocha-rename-new.md'}]);
      });
  });

  it('Rename non-existent file is rejected', function() {
    return expect(
      sftp.rename(join(sftpUrl, 'no-such-file.txt'), join(sftpUrl, 'dummy.md'))
    ).to.be.rejectedWith('No such file');
  });

  it('Rename to existing file name is rejected', function() {
    return expect(
      sftp.rename(
        join(sftpUrl, 'mocha-rename-new.md'),
        join(sftpUrl, 'mocha-conflict.md')
      )
    ).to.be.rejectedWith('Failed to rename file');
  });
});

describe('Chmod method tests', function() {
  before('Chmod setup hook', function() {
    return cHooks.chmodSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('Chmod cleanup hook', function() {
    return cHooks.chmodCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Chmod should return a promise', function() {
    return expect(sftp.chmod(join(sftpUrl, 'mocha-chmod.txt'), 0o444)).to.be.a(
      'promise'
    );
  });

  it('Chmod on a file reports correct mode', function() {
    return sftp
      .chmod(join(sftpUrl, 'mocha-chmod.txt'), 0o777)
      .then(() => {
        return sftp.list(sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'mocha-chmod.txt',
            rights: {
              user: 'rwx',
              group: 'rwx',
              other: 'rwx'
            }
          }
        ]);
      });
  });

  it('Chmod on non-existent file is rejecterd', function() {
    return expect(
      sftp.chmod(join(sftpUrl, 'does-not-exist.txt'), 0o777)
    ).to.be.rejectedWith('No such file');
  });
});
