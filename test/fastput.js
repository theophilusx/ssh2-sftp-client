'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const pHooks = require('./hooks/fastPut-hooks');

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

describe('Fastput method tests', function() {
  before('FastPut setup hook', function() {
    return pHooks.fastPutSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('FastPut cleanup hook', function() {
    return pHooks.fastPutCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('FastPut large text file', function() {
    return sftp
      .fastPut(join(localUrl, 'test-file1.txt'), join(sftpUrl, 'remote.md'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(sftpUrl, 'remote.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 6973257});
      });
  });

  it('FastPut large gzipped file', function() {
    return sftp
      .fastPut(
        join(localUrl, 'test-file2.txt.gz'),
        join(sftpUrl, 'remote2.md.gz')
      )
      .then(() => {
        return sftp.stat(join(sftpUrl, 'remote2.md.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 570314});
      });
  });

  it('FastPut with bad src is rejected', function() {
    return expect(
      sftp.fastPut(
        join(localUrl, 'file-not-exist.txt'),
        join(sftpUrl, 'fastput-error.txt')
      )
    ).to.rejectedWith('Failed to upload');
  });

  it('FastPut with bad destination directory is rejected', function() {
    return expect(
      sftp.fastPut(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'non-existent-dir', 'fastput-error.txt')
      )
    ).to.rejectedWith('Failed to upload');
  });
});
