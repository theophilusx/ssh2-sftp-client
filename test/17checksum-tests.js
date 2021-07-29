'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const checksum = require('checksum');
const {config, getConnection, makeLocalPath} = require('./hooks/global-hooks');
const {checksumCleanup} = require('./hooks/checksum-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('put() and get() checksum tests', function () {
  let sftp;

  before('checksum() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('Checksum() test cleanup hook', async function () {
    await checksumCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('Large file checksum', function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteSrc = `${config.sftpUrl}/checksum-file1.txt`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file1.txt');
    let srcChecksum, copyChecksum;

    return sftp
      .put(localSrc, remoteSrc, {encoding: 'utf8'})
      .then(() => {
        return sftp.get(remoteSrc, localCopy, {encoding: 'utf8'});
      })
      .then(() => {
        return new Promise(function (resolve, reject) {
          checksum.file(localSrc, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        srcChecksum = sum;
        return new Promise(function (resolve, reject) {
          checksum.file(localCopy, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });

  it('Gzipped file checksum', function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remoteSrc = `${config.sftpUrl}/checksum-file2.txt.gz`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file2.txt.gz');
    let srcChecksum, copyChecksum;

    return sftp
      .put(localSrc, remoteSrc)
      .then(() => {
        return sftp.get(remoteSrc, localCopy);
      })
      .then(() => {
        return new Promise(function (resolve, reject) {
          checksum.file(localSrc, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        srcChecksum = sum;
        return new Promise(function (resolve, reject) {
          checksum.file(localCopy, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });
});

describe('fastPut() and fastGet() checksum tests', function () {
  let sftp;

  before('checksum setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('Checksum test cleanup hook', async function () {
    await checksumCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('Large file checksum', function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteSrc = `${config.sftpUrl}/checksum-file1.txt`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file1.txt');
    let srcChecksum, copyChecksum;

    return sftp
      .fastPut(localSrc, remoteSrc, {encoding: 'utf8'})
      .then(() => {
        return sftp.fastGet(remoteSrc, localCopy, {encoding: 'utf8'});
      })
      .then(() => {
        return new Promise(function (resolve, reject) {
          checksum.file(localSrc, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        srcChecksum = sum;
        return new Promise(function (resolve, reject) {
          checksum.file(localCopy, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });

  it('Gzipped file checksum', function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remoteSrc = `${config.sftpUrl}/checksum-file2.txt.gz`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file2.txt.gz');
    let srcChecksum, copyChecksum;

    return sftp
      .fastPut(localSrc, remoteSrc)
      .then(() => {
        return sftp.fastGet(remoteSrc, localCopy);
      })
      .then(() => {
        return new Promise(function (resolve, reject) {
          checksum.file(localSrc, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        srcChecksum = sum;
        return new Promise(function (resolve, reject) {
          checksum.file(localCopy, function (err, sum) {
            if (err) {
              return reject(err);
            }
            return resolve(sum);
          });
        }).catch((err) => {
          throw new Error(err.message);
        });
      })
      .then((sum) => {
        copyChecksum = sum;
        return expect(srcChecksum).to.equal(copyChecksum);
      });
  });
});
