'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection,
  makeLocalPath,
  makeRemotePath
} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('uploadDir tests', function() {
  let sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('UploadDir setup hook', async function() {
    sftp = await getConnection('upload');
    return true;
  });

  after('UploadDir clenaup hook', async function() {
    await closeConnection('upload', sftp);
    return true;
  });

  it('Upload directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Uploaded top-level files', async function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      {name: 'file1.txt', type: '-', size: 6973257},
      {name: 'file2.txt.gz', type: '-', size: 570314},
      {name: 'sub1', type: 'd'},
      {name: 'sub3', type: 'd'}
    ]);
  });
});

describe('Partial file upload', function() {
  let sftpHook, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('UploadDir setup hook', async function() {
    sftpHook = await getConnection('upload-hook');
    sftp = await getConnection('upload');
    let remotePath = makeRemotePath(config.sftpUrl, 'upload-test', 'sub1');
    await sftpHook.rmdir(remotePath, true);
    return true;
  });

  after('UploadDir clenaup hook', async function() {
    await closeConnection('upload', sftp);
    await closeConnection('upload-hook', sftpHook);
    return true;
  });

  it('Upload directory 2', function() {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Uploaded sub-directory files', async function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test', 'sub1');
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      {name: 'file3.txt', type: '-', size: 6973257},
      {name: 'file4.txt.gz', type: '-', size: 570314},
      {name: 'sub2', type: 'd'}
    ]);
  });
});
