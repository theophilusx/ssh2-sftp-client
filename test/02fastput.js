'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {fastPutCleanup} = require('./hooks/fastPut-hooks');
const {makeLocalPath, makeRemotePath} = require('./hooks/global-hooks');
const fs = require('fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('fastPut() method tests', function() {
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
        makeLocalPath(config.localUrl, 'test-file2.txt.gz'),
        makeRemotePath(config.sftpUrl, 'fastput-promise-test.gz')
      )
    ).to.be.a('promise');
  });

  it('fastPut large text file', async function() {
    let localPath = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remotePath = makeRemotePath(config.sftpUrl, 'fastput-text.txt');
    await sftp.fastPut(localPath, remotePath, {encoding: 'utf8'});
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut large gzipped file', async function() {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = makeRemotePath(config.sftpUrl, 'fastput-text.txt.gz');
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut with bad src is rejected', function() {
    return expect(
      sftp.fastPut(
        makeLocalPath(config.localUrl, 'file-not-exist.txt'),
        makeRemotePath(config.sftpUrl, 'fastput-error.txt')
      )
    ).to.rejectedWith('No such file');
  });

  it('fastPut with bad destination directory is rejected', function() {
    return expect(
      sftp.fastPut(
        makeLocalPath(config.localUrl, 'test-file1.txt'),
        makeRemotePath(config.sftpUrl, 'non-existent-dir', 'fastput-error.txt')
      )
    ).to.rejectedWith('No such file');
  });

  it('fastPut remote relative path 1', async function() {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = './testServer/fastput-relative1-gzip.txt.gz';
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut remote relative path 2', async function() {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = `../${config.username}/testServer/fastput-relative2-gzip.txt.gz`;
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut local relative path 3', async function() {
    let localPath = './test/testData/test-file2.txt.gz';
    let remotePath = makeRemotePath(
      config.sftpUrl,
      'fastput-relative3-gzip.txt.gz'
    );
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut local relative path 4', async function() {
    let localPath = '../ssh2-sftp-client/test/testData/test-file2.txt.gz';
    let remotePath = makeRemotePath(
      config.sftpUrl,
      'fastput-relative4-gzip.txt.gz'
    );
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });
});
