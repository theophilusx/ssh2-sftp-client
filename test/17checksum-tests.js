'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const checksum = require('checksum');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {checksumCleanup} = require('./hooks/checksum-hooks');
const {makeLocalPath, makeRemotePath} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('put() and get() checksum tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('checksum setup hook', async function() {
    hookSftp = await getConnection('checksum-hook');
    sftp = await getConnection('checksum');
    return true;
  });

  after('Checksum test cleanup hook', async function() {
    await checksumCleanup(hookSftp, config.sftpUrl, config.localUrl);
    await closeConnection('checksum', sftp);
    await closeConnection('checksum-hook', hookSftp);
    return true;
  });

  it('Large file checksum', function() {
    let localSrc = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteSrc = makeRemotePath(config.sftpUrl, 'checksum-file1.txt');
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file1.txt');
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
    let localSrc = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remoteSrc = makeRemotePath(config.sftpUrl, 'checksum-file2.txt.gz');
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file2.txt.gz');
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

describe('fastPut() and fastGet() checksum tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('checksum setup hook', async function() {
    hookSftp = await getConnection('checksum2-hook');
    sftp = await getConnection('checksum2');
    return true;
  });

  after('Checksum test cleanup hook', async function() {
    await checksumCleanup(hookSftp, config.sftpUrl, config.localUrl);
    await closeConnection('checksum2', sftp);
    await closeConnection('checksum2-hook', hookSftp);
    return true;
  });

  it('Large file checksum', function() {
    let localSrc = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteSrc = makeRemotePath(config.sftpUrl, 'checksum-file1.txt');
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file1.txt');
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
    let localSrc = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remoteSrc = makeRemotePath(config.sftpUrl, 'checksum-file2.txt.gz');
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file2.txt.gz');
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
