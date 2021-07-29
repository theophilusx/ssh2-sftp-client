'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const stream = require('stream');
const {setup, closeDown} = require('./hooks/global-hooks');
const pHooks = require('./hooks/put-hooks');

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

describe('Put method tests', function() {
  after('Put cleanup hook', function() {
    return pHooks.putCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Put should return a promise', function() {
    return expect(
      sftp.put(Buffer.from('blah'), join(sftpUrl, 'mocha-put-buffer.md'))
    ).to.be.a('promise');
  });

  it('Put large text file', function() {
    return sftp
      .put(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'mocha-put-string.md')
      )
      .then(() => {
        return sftp.stat(join(sftpUrl, 'mocha-put-string.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 6973257});
      });
  });

  it('Put data from buffer into remote file', function() {
    return sftp
      .put(Buffer.from('hello'), join(sftpUrl, 'mocha-put-buffer.md'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(sftpUrl, 'mocha-put-buffer.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('Put data from stream into remote file', function() {
    var str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .put(str2, join(sftpUrl, 'mocha-put-stream.md'), {encoding: 'utf8'})
      .then(() => {
        return sftp.stat(join(sftpUrl, 'mocha-put-stream.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 14});
      });
  });

  it('Put with no src file should be rejected', function() {
    return expect(
      sftp.put(
        join(localUrl, 'no-such-file.txt'),
        join(sftpUrl, 'mocha-put-no-file.txt')
      )
    ).to.be.rejectedWith('Failed to upload');
  });

  it('Put with bad dst path should be rejected', function() {
    return expect(
      sftp.put(
        join(localUrl, 'test-file1.txt'),
        join(sftpUrl, 'bad-directory', 'bad-file.txt')
      )
    ).to.be.rejectedWith('Failed to upload');
  });
});
