'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const stream = require('stream');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {putCleanup} = require('./hooks/put-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('put() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Put setup hook', async function() {
    hookSftp = await getConnection('put-hook');
    sftp = await getConnection('put');
    return true;
  });

  after('Put cleanup hook', async function() {
    await putCleanup(hookSftp, config.sftpUrl);
    await closeConnection('put', sftp);
    await closeConnection('put-hook', hookSftp);
    return true;
  });

  it('Put should return a promise', function() {
    return expect(
      sftp.put(
        Buffer.from('put promise test'),
        join(config.sftpUrl, 'put-promise.txt')
      )
    ).to.be.a('promise');
  });

  it('Put large text file', function() {
    return sftp
      .put(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'put-large.txt')
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-large.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 6973257});
      });
  });

  it('Put data from buffer into remote file', function() {
    return sftp
      .put(Buffer.from('hello'), join(config.sftpUrl, 'put-buffer.txt'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-buffer.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('Put data from stream into remote file', function() {
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .put(str2, join(config.sftpUrl, 'put-stream.txt'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-stream.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 14});
      });
  });

  it('Put with no src file should be rejected', function() {
    return expect(
      sftp.put(
        join(config.localUrl, 'no-such-file.txt'),
        join(config.sftpUrl, 'mocha-put-no-file.txt')
      )
    ).to.be.rejectedWith('no such file or directory');
  });

  it('Put with bad dst path should be rejected', function() {
    return expect(
      sftp.put(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'bad-directory', 'bad-file.txt')
      )
    ).to.be.rejectedWith('No such file');
  });

  it('put relative remote path 1', function() {
    return sftp
      .put(
        join(config.localUrl, 'test-file2.txt.gz'),
        './testServer/put-relative1-gzip.txt.gz'
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-relative1-gzip.txt.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 570314});
      });
  });

  it('Put relative remote path 2', function() {
    return sftp
      .put(
        join(config.localUrl, 'test-file2.txt.gz'),
        `../${config.username}/testServer/put-relative2-gzip.txt.gz`
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-relative2-gzip.txt.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 570314});
      });
  });

  it('put relative local path 3', function() {
    return sftp
      .put(
        './test/testData/test-file2.txt.gz',
        join(config.sftpUrl, 'put-relative3-gzip.txt.gz')
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-relative3-gzip.txt.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 570314});
      });
  });

  it('put relative local path 4', function() {
    return sftp
      .put(
        '../ssh2-sftp-client/test/testData/test-file2.txt.gz',
        join(config.sftpUrl, 'put-relative4-gzip.txt.gz')
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'put-relative4-gzip.txt.gz'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 570314});
      });
  });
});
