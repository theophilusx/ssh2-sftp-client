'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const fs = require('fs');
const {setup, closeDown} = require('./hooks/global-hooks');
const gHooks = require('./hooks/fastGet-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

let hookSftp, sftp, sftpUrl, localUrl;

before('Global setup', function() {
  return setup()
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
  return closeDown()
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

describe('FastGet method tests', function() {
  before('FastGet setup hook', function() {
    return gHooks.fastGetSetup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('FastGet cleanup hook', function() {
    return gHooks.fastGetCleanup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('FastGet small text file', function() {
    return sftp
      .fastGet(
        join(sftpUrl, 'mocha-fastget1.md'),
        join(localUrl, 'fastGet', 'local1.md'),
        {encoding: 'utf8'}
      )
      .then(() => {
        return expect(
          fs.statSync(join(localUrl, 'fastGet', 'local1.md'))
        ).to.containSubset({size: 8});
      });
  });

  it('FastGet large text file', function() {
    return sftp
      .fastGet(
        join(sftpUrl, 'mocha-fastget2.txt'),
        join(localUrl, 'fastGet', 'local2.txt'),
        {encoding: 'utf8'}
      )
      .then(() => {
        return expect(
          fs.statSync(join(localUrl, 'fastGet', 'local2.txt'))
        ).to.containSubset({size: 6973257});
      });
  });

  it('FastGet gzipped file', function() {
    return sftp
      .fastGet(
        join(sftpUrl, 'mocha-fastget3.txt.gz'),
        join(localUrl, 'fastGet', 'local3.txt.gz')
      )
      .then(() => {
        return expect(
          fs.statSync(join(localUrl, 'fastGet', 'local3.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });

  it('FastGet non-existent file is rejected', function() {
    return expect(
      sftp.fastGet(
        join(sftpUrl, 'mocha-fastget-not-exist.txt'),
        join(localUrl, 'fastGet', 'not-exist.txt')
      )
    ).to.be.rejectedWith('No such file');
  });
});
