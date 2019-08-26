'use strict';

// smaller utility method tests

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const rnHooks = require('./hooks/rename-hooks');

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
    ).to.be.rejectedWith('Failure');
  });
});
