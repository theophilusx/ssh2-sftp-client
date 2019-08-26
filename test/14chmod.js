'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const cHooks = require('./hooks/chmod-hooks');

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
