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

describe('FastGet method tests', function() {
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

  it('FastGet small text file', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'mocha-fastget1.md'),
        join(config.localUrl, 'fastGet', 'local1.md'),
        {encoding: 'utf8'}
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastGet', 'local1.md'))
        ).to.containSubset({size: 8});
      });
  });

  it('FastGet large text file', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'mocha-fastget2.txt'),
        join(config.localUrl, 'fastGet', 'local2.txt'),
        {encoding: 'utf8'}
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastGet', 'local2.txt'))
        ).to.containSubset({size: 6973257});
      });
  });

  it('FastGet gzipped file', function() {
    return sftp
      .fastGet(
        join(config.sftpUrl, 'mocha-fastget3.txt.gz'),
        join(config.localUrl, 'fastGet', 'local3.txt.gz')
      )
      .then(() => {
        return expect(
          fs.statSync(join(config.localUrl, 'fastGet', 'local3.txt.gz'))
        ).to.containSubset({size: 570314});
      });
  });

  it('FastGet non-existent file is rejected', function() {
    return expect(
      sftp.fastGet(
        join(config.sftpUrl, 'mocha-fastget-not-exist.txt'),
        join(config.localUrl, 'fastGet', 'not-exist.txt')
      )
    ).to.be.rejectedWith('No such file');
  });
});
