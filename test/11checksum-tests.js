'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const checksum = require('checksum');
const {setup, closeDown} = require('./hooks/global-hooks');
const cHooks = require('./hooks/checksum-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

let hookSftp, sftp, sftpUrl, localUrl;

before('Global setup', function() {
  return setup()
    .then(testEnv => {
      hookSftp = testEnv.hookSftp;
      sftp = testEnv.sftp;
      (sftpUrl = testEnv.sftpUrl), (localUrl = testEnv.localUrl);
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

describe('Put/Get checksum tests', function() {
  after('Checksum test cleanup hook', function() {
    return cHooks.checksumCleanup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Large file checksum', function() {
    let localSrc = join(localUrl, 'test-file1.txt');
    let remoteSrc = join(sftpUrl, 'checksum-file1.txt');
    let localCopy = join(localUrl, 'checksum-file1.txt');
    let srcChecksum, copyChecksum;

    return sftp
      .put(localSrc, remoteSrc, {encoding: 'utf8'})
      .then(() => {
        return sftp.get(remoteSrc, localCopy, {encoding: 'utf8'});
      })
      .then(() => {
        return new Promise(function(resolve, reject) {
          checksum.file(localSrc, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        srcChecksum = sum;
        return new Promise(function(resolve, reject) {
          checksum.file(localCopy, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });

  it('Gzipped file checksum', function() {
    let localSrc = join(localUrl, 'test-file2.txt.gz');
    let remoteSrc = join(sftpUrl, 'checksum-file2.txt.gz');
    let localCopy = join(localUrl, 'checksum-file2.txt.gz');
    let srcChecksum, copyChecksum;

    return sftp
      .put(localSrc, remoteSrc)
      .then(() => {
        return sftp.get(remoteSrc, localCopy);
      })
      .then(() => {
        return new Promise(function(resolve, reject) {
          checksum.file(localSrc, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        srcChecksum = sum;
        return new Promise(function(resolve, reject) {
          checksum.file(localCopy, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });
});

describe('FastPut/FastGet checksum tests', function() {
  after('Checksum test cleanup hook', function() {
    return cHooks.checksumCleanup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Large file checksum', function() {
    let localSrc = join(localUrl, 'test-file1.txt');
    let remoteSrc = join(sftpUrl, 'checksum-file1.txt');
    let localCopy = join(localUrl, 'checksum-file1.txt');
    let srcChecksum, copyChecksum;

    return sftp
      .fastPut(localSrc, remoteSrc, {encoding: 'utf8'})
      .then(() => {
        return sftp.fastGet(remoteSrc, localCopy, {encoding: 'utf8'});
      })
      .then(() => {
        return new Promise(function(resolve, reject) {
          checksum.file(localSrc, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        srcChecksum = sum;
        return new Promise(function(resolve, reject) {
          checksum.file(localCopy, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });

  it('Gzipped file checksum', function() {
    let localSrc = join(localUrl, 'test-file2.txt.gz');
    let remoteSrc = join(sftpUrl, 'checksum-file2.txt.gz');
    let localCopy = join(localUrl, 'checksum-file2.txt.gz');
    let srcChecksum, copyChecksum;

    return sftp
      .fastPut(localSrc, remoteSrc)
      .then(() => {
        return sftp.fastGet(remoteSrc, localCopy);
      })
      .then(() => {
        return new Promise(function(resolve, reject) {
          checksum.file(localSrc, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        srcChecksum = sum;
        return new Promise(function(resolve, reject) {
          checksum.file(localCopy, function(err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch(err => {
          throw new Error(err.message);
        });
      })
      .then(sum => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });
});
