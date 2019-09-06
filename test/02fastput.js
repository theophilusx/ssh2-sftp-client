'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {fastPutCleanup} = require('./hooks/fastPut-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Fastput method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('fastPut setup hook', async function() {
    hookSftp = await getConnection('fastput-hook');
    sftp = await getConnection('fastput');
    return true;
  });

  after('fastPut cleanup hook', async function() {
    await fastPutCleanup(hookSftp, config.sftpUrl);
    await closeConnection('fastput', sftp);
    await closeConnection('fastput-hook', hookSftp);
    return true;
  });

  it('fastPut returns a promise', function() {
    return expect(
      sftp.fastPut(
        join(config.localUrl, 'test-file2.txt.gz'),
        join(config.sftpUrl, 'fastput-promise-test.gz')
      )
    ).to.be.a('promise');
  });

  it('fastPut large text file', function() {
    return sftp
      .fastPut(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'fastput-text.txt'),
        {
          encoding: 'utf8'
        }
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'fastput-text.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 6973257});
      });
  });

  it('fastPut large gzipped file', function() {
    return sftp
      .fastPut(
        join(config.localUrl, 'test-file2.txt.gz'),
        join(config.sftpUrl, 'fastput-text.txt.gz')
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'fastput-text.txt.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 570314});
      });
  });

  it('fastPut with bad src is rejected', function() {
    return expect(
      sftp.fastPut(
        join(config.localUrl, 'file-not-exist.txt'),
        join(config.sftpUrl, 'fastput-error.txt')
      )
    ).to.rejectedWith('no such file or directory');
  });

  it('fastPut with bad destination directory is rejected', function() {
    return expect(
      sftp.fastPut(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'non-existent-dir', 'fastput-error.txt')
      )
    ).to.rejectedWith('No such file');
  });
});
