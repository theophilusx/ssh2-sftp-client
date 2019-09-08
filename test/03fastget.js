'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const fs = require('fs');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const gHooks = require('./hooks/fastGet-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('fastGet() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('FastGet setup hook', async function() {
    hookSftp = await getConnection('fastget-hook');
    sftp = await getConnection('fastget');
    await gHooks.fastGetSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('FastGet cleanup hook', async function() {
    await gHooks.fastGetCleanup(hookSftp, config.sftpUrl, config.localUrl);
    await closeConnection('fastget', sftp);
    await closeConnection('fastget-hook', hookSftp);
    return true;
  });

  it('fastGet returns a promise', function() {
    return expect(
      sftp.fastGet(
        join(config.sftpUrl, 'fastget-promise.txt'),
        join(config.localUrl, 'fastget-promise.txt')
      )
    ).to.be.a('promise');
  });

  it('fastGet small text file', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'fastget-small.txt'),
        join(config.localUrl, 'fastget-small.txt'),
        {encoding: 'utf8'}
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-small.txt'))
        ).to.containSubset({size: 19});
      });
  });

  it('fastGet large text file', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'fastget-large.txt'),
        join(config.localUrl, 'fastget-large.txt'),
        {encoding: 'utf8'}
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-large.txt'))
        ).to.containSubset({size: 6973257});
      });
  });

  it('fastGet gzipped file', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'fastget-gzip.txt.gz'),
        join(config.localUrl, 'fastget-gzip.txt.gz')
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-gzip.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });

  it('fastGet non-existent file is rejected', function() {
    return expect(
      sftp.fastGet(
        join(config.sftpUrl, 'fastget-not-exist.txt'),
        join(config.localUrl, 'fastget-not-exist.txt')
      )
    ).to.be.rejectedWith('No such file');
  });

  it('fastGet remote relative path 1', function() {
    return sftp
      .fastGet(
        './testServer/fastget-gzip.txt.gz',
        join(config.localUrl, 'fastget-relative1-gzip.txt.gz')
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-relative1-gzip.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });

  it('fastGet remote relative path 2', function() {
    return sftp
      .fastGet(
        `../${config.username}/testServer/fastget-gzip.txt.gz`,
        join(config.localUrl, 'fastget-relative2-gzip.txt.gz')
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-relative2-gzip.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });

  it('fastGet local relative path 3', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'fastget-gzip.txt.gz'),
        './test/testData/fastget-relative3-gzip.txt.gz'
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-relative3-gzip.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });

  it('fastGet local relative path 4', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'fastget-gzip.txt.gz'),
        '../ssh2-sftp-client/test/testData/fastget-relative4-gzip.txt.gz'
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastget-relative4-gzip.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });
});
