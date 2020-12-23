'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection, makeLocalPath} = require('./hooks/global-hooks');
const fs = require('fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('uploadDir tests', function () {
  let sftp;

  before('UploadDir() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('UploadDir() clenaup hook', async function () {
    let remotePath = `${config.sftpUrl}/upload-test2`;
    await sftp.rmdir(remotePath, true);
    await sftp.end();
    return true;
  });

  it('Upload directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Uploaded top-level files', async function () {
    let remoteDir = `${config.sftpUrl}/upload-test`;
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      {name: 'file2.txt.gz', type: '-', size: 570314},
      {name: 'sub1', type: 'd'},
      {name: 'sub3', type: 'd'},
      {name: 'file1.txt', type: '-'},
      {name: '.hidden-file.txt', type: '-'},
      {name: '.hidden-sub1', type: 'd'}
    ]);
  });

  it('Upload filtered directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test2`;
    return expect(
      sftp.uploadDir(localDir, remoteDir, /^[^.]/)
    ).to.eventually.equal(`${localDir} uploaded to ${remoteDir}`);
  });

  it('Uploaded filtered top-level files', async function () {
    let remoteDir = `${config.sftpUrl}/upload-test2`;
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.not.containSubset([
      {name: 'file2.txt.gz', type: '-', size: 570314},
      {name: '.hidden-sub1', type: 'd'},
      {name: '.hidden-file.txt', type: '-'}
    ]);
  });
});

describe('Partial file upload', function () {
  let sftp;

  before('UploadDir() setup hook', async function () {
    sftp = await getConnection();
    let remotePath = `${config.sftpUrl}/upload-test/sub1`;
    await sftp.rmdir(remotePath, true);
    return true;
  });

  after('UploadDir() clenaup hook', async function () {
    await sftp.end();
    return true;
  });

  it('Upload directory 2', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Uploaded sub-directory files', async function () {
    let remoteDir = `${config.sftpUrl}/upload-test/sub1`;
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      {name: 'sub2', type: 'd'},
      {name: 'file4.txt.gz', type: '-', size: 570314},
      {name: 'file3.txt', type: '-'}
    ]);
  });
});

describe('Uploaddir bad path tests', function () {
  let sftp;

  before('UploadDir bad path setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('UploadDir clenaup hook', async function () {
    await sftp.end();
    return true;
  });

  it('Non-existent source directory is rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'no-such-dir');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /no such file or directory/
    );
  });

  it('Source directory is a file rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /not a directory/
    );
  });

  it('Destination directory is a file rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test/file1.txt`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /Bad path/
    );
  });
});

describe('Download directory', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('download directory clenaup hook', async function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test2');
    fs.rmdirSync(localDir, {recursive: true});
    await sftp.end();
    return true;
  });

  it('Download directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.eventually.equal(
      `${remoteDir} downloaded to ${localDir}`
    );
  });

  it('Download filtered directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test2');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, /^[^.]/)
    ).to.eventually.equal(`${remoteDir} downloaded to ${localDir}`);
  });

  it('Bad src directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'not-needed');
    let remoteDir = `${config.sftpUrl}/no-such-dir`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith(
      'No such file'
    );
  });

  it('Bad dst directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith(
      'Bad path'
    );
  });
});

describe('Partial download dir', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    let localDir = makeLocalPath(config.localUrl, 'download-test', 'sub1');
    fs.rmdirSync(localDir, {recursive: true});
    return true;
  });

  after('download directory clenaup hook', async function () {
    let remoteDir = `${config.sftpUrl}/upload-test`;
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    await sftp.rmdir(remoteDir, true);
    fs.rmdirSync(localDir, {recursive: true});
    await sftp.end();
    return true;
  });

  it('Download partial directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.eventually.equal(
      `${remoteDir} downloaded to ${localDir}`
    );
  });
});
