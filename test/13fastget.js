'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const {config, getConnection} = require('./hooks/global-hooks');
const gHooks = require('./hooks/fastGet-hooks');
const {makeLocalPath, lastRemoteDir} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('fastGet() method tests', function () {
  let sftp;

  before('FastGet() setup hook', async function () {
    sftp = await getConnection();
    await gHooks.fastGetSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('FastGet() cleanup hook', async function () {
    await gHooks.fastGetCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('fastGet returns a promise', function () {
    return expect(
      sftp.fastGet(
        `${config.sftpUrl}/fastget-promise.txt`,
        makeLocalPath(config.localUrl, 'fastget-promise.txt')
      )
    ).to.be.a('promise');
  });

  it('fastGet small text file', async function () {
    let localPath = makeLocalPath(config.localUrl, 'fastget-small.txt');
    let remotePath = `${config.sftpUrl}/fastget-small.txt`;
    await sftp.fastGet(remotePath, localPath, {encoding: 'utf8'});
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet large text file', async function () {
    let localPath = makeLocalPath(config.localUrl, 'fastget-large.txt');
    let remotePath = `${config.sftpUrl}/fastget-large.txt`;
    await sftp.fastGet(remotePath, localPath, {encoding: 'utf8'});
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet gzipped file', async function () {
    let localPath = makeLocalPath(config.localUrl, 'fastget-gzip.txt.gz');
    let remotePath = `${config.sftpUrl}/fastget-gzip.txt.gz`;
    await sftp.fastGet(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet non-existent file is rejected', function () {
    return expect(
      sftp.fastGet(
        `${config.sftpUrl}/fastget-not-exist.txt`,
        makeLocalPath(config.localUrl, 'fastget-not-exist.txt')
      )
    ).to.be.rejectedWith('No such file');
  });

  it('fastGet remote relative path 1', async function () {
    let localPath = makeLocalPath(
      config.localUrl,
      'fastget-relative1-gzip.txt.gz'
    );
    let remotePath = './testServer/fastget-gzip.txt.gz';
    await sftp.fastGet(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet remote relative path 2', async function () {
    let localPath = makeLocalPath(
      config.localUrl,
      'fastget-relative2-gzip.txt.gz'
    );
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/fastget-gzip.txt.gz`;
    await sftp.fastGet(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet local relative path 3', async function () {
    let localPath = './test/testData/fastget-relative3-gzip.txt.gz';
    let remotePath = `${config.sftpUrl}/fastget-gzip.txt.gz`;
    await sftp.fastGet(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet local relative path 4', async function () {
    let localPath = './test/testData/fastget-relative4-gzip.txt.gz';
    let remotePath = `${config.sftpUrl}/fastget-gzip.txt.gz`;
    await sftp.fastGet(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('fastGet throws exception when target is a dir', function () {
    return expect(
      sftp.fastGet(`${config.sftpUrl}/fg-dir`, './test/testData/fg-dir')
    ).to.be.rejectedWith(/Not a regular file/);
  });
});

// add test for missing arguments for fastGet
