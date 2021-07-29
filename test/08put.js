'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const stream = require('stream');
const {config, getConnection} = require('./hooks/global-hooks');
const {putCleanup} = require('./hooks/put-hooks');
const {makeLocalPath, lastRemoteDir} = require('./hooks/global-hooks');
const fs = require('fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('put() method tests', function () {
  let sftp;

  before('put() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('put() cleanup hook', async function () {
    await putCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('put should return a promise', function () {
    return expect(
      sftp.put(
        Buffer.from('put promise test'),
        `${config.sftpUrl}/put-promise.txt`
      )
    ).to.be.a('promise');
  });

  it('put large text file', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remotePath = `${config.sftpUrl}/put-large.txt`;
    await sftp.put(localPath, remotePath);
    let localStats = fs.statSync(localPath);
    let stats = await sftp.stat(remotePath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('put data from buffer into remote file', function () {
    return sftp
      .put(Buffer.from('hello'), `${config.sftpUrl}/put-buffer.txt`, {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(`${config.sftpUrl}/put-buffer.txt`);
      })
      .then((stats) => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('put data from stream into remote file', function () {
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .put(str2, config.sftpUrl + '/put-stream.txt', {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(`${config.sftpUrl}/put-stream.txt`);
      })
      .then((stats) => {
        return expect(stats).to.containSubset({size: 14});
      });
  });

  it('put with no src file should be rejected', function () {
    return expect(
      sftp.put(
        makeLocalPath(config.localUrl, 'no-such-file.txt'),
        `${config.sftpUrl}/mocha-put-no-file.txt`
      )
    ).to.be.rejectedWith('Bad path');
  });

  it('put with bad dst path should be rejected', function () {
    return expect(
      sftp.put(
        makeLocalPath(config.localUrl, 'test-file1.txt'),
        `${config.sftpUrl}/bad-directory/bad-file.txt`
      )
    ).to.be.rejectedWith('No such file');
  });

  it('put relative remote path 1', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = './testServer/put-relative1-gzip.txt.gz';
    await sftp.put(localPath, remotePath);
    let localStats = fs.statSync(localPath);
    let stats = await sftp.stat(remotePath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('put relative remote path 2', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/put-relative2-gzip.txt.gz`;
    await sftp.put(localPath, remotePath);
    let localStats = fs.statSync(localPath);
    let stats = await sftp.stat(remotePath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('put relative local path 3', async function () {
    let localPath = './test/testData/test-file2.txt.gz';
    let remotePath = `${config.sftpUrl}/put-relative3-gzip.txt.gz`;
    await sftp.put(localPath, remotePath);
    let localStats = fs.statSync(localPath);
    let stats = await sftp.stat(remotePath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('put relative local path 4', async function () {
    let localPath = '../ssh2-sftp-client/test/testData/test-file2.txt.gz';
    let remotePath = `${config.sftpUrl}/put-relative4-gzip.txt.gz`;
    await sftp.put(localPath, remotePath);
    let localStats = fs.statSync(localPath);
    let stats = await sftp.stat(remotePath);
    return expect(stats.size).to.equal(localStats.size);
  });
});
