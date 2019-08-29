'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const mHooks = require('./hooks/mkdir-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

let hookSftp, sftp, sftpUrl;

before('Global setup', function() {
  return gHooks
    .setup()
    .then(testEnv => {
      hookSftp = testEnv.hookSftp;
      sftp = testEnv.sftp;
      sftpUrl = testEnv.sftpUrl;
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

describe('test mkdir without permissions', function() {
  it('Create directory without write permission throws exception', function() {
    return expect(
      sftp.mkdir(join(sftpUrl, 'perm-test', 'dir-t2', 'dir-t6'), true)
    ).to.be.rejectedWith('Failed to create directory');
  });
});

describe('test mkdir with relative paths', function() {
  it('Relative directory name creates dir', function() {
    let path = 'xyz';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${path} directory created`
    );
  });

  it('Relative directory with sub dir creation', function() {
    let path = 'xyz/abc';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${path} directory created`
    );
  });

  it('Relative dir name created with recursive flag', function() {
    let path = 'abc';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `./${path} directory created`
    );
  });

  it('relative dir and sub dir created with recursive flag', function() {
    let path = 'def/ghi';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${path} directory created`
    );
  });
});
