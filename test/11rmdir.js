'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const rHooks = require('./hooks/rmdir-hooks');

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
