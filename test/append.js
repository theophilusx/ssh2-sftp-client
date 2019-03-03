'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const stream = require('stream');
const {setup, closeDown} = require('./hooks/global-hooks');
const aHooks = require('./hooks/append-hooks');

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

describe('Append method tests', function() {
  before('Append test setup hook', function() {
    return aHooks.appendSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('Append test cleanup hook', function() {
    return aHooks.appendCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Append should return a promise', function() {
    let testFile = 'mocha-append-test1.md';

    return expect(
      sftp.append(Buffer.from('append test 1'), join(sftpUrl, testFile), {
        encoding: 'utf8'
      })
    ).to.be.a('promise');
  });

  it('Append two files is rejected', function() {
    let testFile = 'mocha-append-test1.md';

    return expect(
      sftp.append(join(localUrl, 'test-file1.txt'), join(sftpUrl, testFile))
    ).to.be.rejectedWith('Cannot append a file to another');
  });

  it('Append buffer to file', function() {
    let testFile = 'mocha-append-test2.md';

    return sftp
      .append(Buffer.from('hello'), join(sftpUrl, testFile), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(sftpUrl, testFile));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('Append stream to file', function() {
    let testFile = 'mocha-append-test3.md';
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .append(str2, join(sftpUrl, testFile), {encoding: 'utf8'})
      .then(() => {
        return sftp.stat(join(sftpUrl, testFile));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 14});
      });
  });

  it('Append with bad dst path is rejected', function() {
    return expect(
      sftp.append(
        Buffer.from('hello'),
        join(sftpUrl, 'bad-directory', 'bad-file.txt')
      )
    ).to.be.rejectedWith('Failed to upload');
  });
});
