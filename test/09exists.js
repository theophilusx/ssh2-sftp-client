'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const eHooks = require('./hooks/exist-hooks');

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
