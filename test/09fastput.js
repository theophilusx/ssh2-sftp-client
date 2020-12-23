'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  makeLocalPath,
  lastRemoteDir
} = require('./hooks/global-hooks');
const {fastPutSetup, fastPutCleanup} = require('./hooks/fastPut-hooks');
const fs = require('fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('fastPut() method tests', function () {
  let sftp;

  before('fastPut() setup hook', async function () {
    sftp = await getConnection();
    fastPutSetup(config.localUrl);
    return true;
  });

  after('fastPut() cleanup hook', async function () {
    await fastPutCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('fastPut returns a promise', function () {
    let p = sftp.fastPut(
      makeLocalPath(config.localUrl, 'test-file2.txt.gz'),
      config.sftpUrl + '/fastput-promise-test.gz'
    );
    expect(p).to.be.a('promise');
    return expect(p).to.be.fulfilled;
  });

  it('fastPut large text file', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remotePath = config.sftpUrl + '/fastput-text.txt';
    // await sftp.fastPut(localPath, remotePath, {encoding: 'utf8'});
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut large gzipped file', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = config.sftpUrl + '/fastput-text.txt.gz';
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut with bad src is rejected', function () {
    return expect(
      sftp.fastPut(
        makeLocalPath(config.localUrl, 'file-not-exist.txt'),
        config.sftpUrl + '/fastput-error.txt'
      )
    ).to.rejectedWith('Bad path');
  });

  it('fastPut with bad destination directory is rejected', function () {
    return expect(
      sftp.fastPut(
        makeLocalPath(config.localUrl, 'test-file1.txt'),
        config.sftpUrl + '/non-existent-dir/fastput-error.txt'
      )
    ).to.rejectedWith('No such file');
  });

  it('fastPut remote relative path 1', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = './testServer/fastput-relative1-gzip.txt.gz';
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut remote relative path 2', async function () {
    let localPath = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/fastput-relative2-gzip.txt.gz`;
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut local relative path 3', async function () {
    let localPath = './test/testData/test-file2.txt.gz';
    let remotePath = config.sftpUrl + '/fastput-relative3-gzip.txt.gz';
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut local relative path 4', async function () {
    let localPath = '../ssh2-sftp-client/test/testData/test-file2.txt.gz';
    let remotePath = config.sftpUrl + '/fastput-relative4-gzip.txt.gz';
    await sftp.fastPut(localPath, remotePath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size).to.equal(localStats.size);
  });

  it('fastPut rejected when local target a dir', function () {
    return expect(
      sftp.fastPut(
        makeLocalPath(config.localUrl, 'fp-dir'),
        `${config.sftpUrl}/fp-dir`
      )
    ).to.be.rejectedWith('Bad path');
  });
});
