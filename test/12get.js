'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const zlib = require('zlib');
const {config, getConnection} = require('./hooks/global-hooks');
const {getSetup, getCleanup} = require('./hooks/get-hooks');
const {makeLocalPath, lastRemoteDir} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('get() method tests', function () {
  let sftp;

  before('get() setup hook', async function () {
    sftp = await getConnection();
    await getSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('get() cleanup hook', async function () {
    await getCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('get returns a promise', function () {
    return expect(sftp.get(config.sftpUrl + '/get-promise.txt')).to.be.a(
      'promise'
    );
  });

  it('get the file content', function () {
    return sftp.get(config.sftpUrl + '/get-promise.txt').then((data) => {
      let body = data.toString();
      return expect(body).to.equal('Get promise test');
    });
  });

  it('get large text file using a stream', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-large.txt');
    let remotePath = config.sftpUrl + '/get-large.txt';
    let out = fs.createWriteStream(localPath, {
      flags: 'w',
      encoding: null
    });
    await sftp.get(remotePath, out);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get gzipped file using a stream', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-gzip.txt.gz');
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    let out = fs.createWriteStream(localPath, {
      flags: 'w',
      encoding: null
    });
    await sftp.get(remotePath, out);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get gzipped file and gunzip in pipe', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-unzip.txt');
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    let gunzip = zlib.createGunzip();
    let out = fs.createWriteStream(localPath, {
      flags: 'w',
      encoding: null
    });
    gunzip.pipe(out);
    await sftp.get(remotePath, gunzip);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(stats.size < localStats.size).to.equal(true);
  });

  it('get non-existent file is rejected', function () {
    return expect(
      sftp.get(config.sftpUrl + '/file-not-exist.md')
    ).to.be.rejectedWith('No such file');
  });

  it('get with relative remote path 1', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-relative1-gzip.txt.gz');
    let remotePath = './testServer/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with relative remote path 2', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-relative2-gzip.txt.gz');
    let remotePath =
      '../' + lastRemoteDir(config.remoteRoot) + '/testServer/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with relative local path 3', async function () {
    let localPath = './test/testData/get-relative3-gzip.txt.gz';
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with relative local path 4', async function () {
    let localPath =
      '../ssh2-sftp-client/test/testData/get-relative4-gzip.txt.gz';
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = fs.statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });
});
