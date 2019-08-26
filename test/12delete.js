'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const dHooks = require('./hooks/delete-hooks');

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
    ).to.be.rejectedWith('No such file');
  });
});
