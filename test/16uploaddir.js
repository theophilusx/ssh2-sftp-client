'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks');
const { basename } = require('node:path');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

const myFilter = (f) => {
  return basename(f).startsWith('.') ? false : true;
};

describe('uploadDir tests', function () {
  let sftp;

  before('uploadDir tests setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('UploadDir tests clenaup hook', async function () {
    try {
      let remotePath = `${config.sftpUrl}/upload-test2`;
      await sftp.rmdir(remotePath, true);
      await sftp.end();
      return true;
    } catch (e) {
      console.log(`Cleanup hook: ${e.message}`);
      return true;
    }
  });

  it('Upload directory', async function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      { name: 'file2.txt.gz', type: '-', size: 570314 },
      { name: 'sub1', type: 'd' },
      { name: 'sub3', type: 'd' },
      { name: 'file1.txt', type: '-' },
      { name: '.hidden-file.txt', type: '-' },
      { name: '.hidden-sub1', type: 'd' },
    ]);
  });

  it('Upload filtered directory', async function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test2`;
    let result = await sftp.uploadDir(localDir, remoteDir, {
      filter: myFilter,
    });
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.not.containSubset([
      { name: 'file2.txt.gz', type: '-', size: 570314 },
      { name: '.hidden-sub1', type: 'd' },
      { name: '.hidden-file.txt', type: '-' },
    ]);
  });
});

describe('uploadDir tests with fastPut', function () {
  let sftp;

  before('uploadDir tests setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('UploadDir tests clenaup hook', async function () {
    let remotePath = `${config.sftpUrl}/upload-test2`;
    await sftp.rmdir(remotePath, true);
    await sftp.end();
    return true;
  });

  it('Upload directory', async function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    let result = await sftp.uploadDir(localDir, remoteDir, {
      useFastput: true,
    });
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      { name: 'file2.txt.gz', type: '-', size: 570314 },
      { name: 'sub1', type: 'd' },
      { name: 'sub3', type: 'd' },
      { name: 'file1.txt', type: '-' },
      { name: '.hidden-file.txt', type: '-' },
      { name: '.hidden-sub1', type: 'd' },
    ]);
  });

  it('Upload filtered directory', async function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test2`;
    let result = await sftp.uploadDir(localDir, remoteDir, {
      filter: myFilter,
      useFastput: true,
    });
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.not.containSubset([
      { name: 'file2.txt.gz', type: '-', size: 570314 },
      { name: '.hidden-sub1', type: 'd' },
      { name: '.hidden-file.txt', type: '-' },
    ]);
  });
});

describe('Partial file upload', function () {
  let sftp;

  before('Partial file upload test setup hook', async function () {
    sftp = await getConnection();
    let remotePath = `${config.sftpUrl}/upload-test/sub1`;
    await sftp.rmdir(remotePath, true);
    return true;
  });

  after('Partial file upload test clenaup hook', async function () {
    await sftp.end();
    return true;
  });

  it('Upload directory 2', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`,
    );
  });

  it('Uploaded sub-directory files', async function () {
    let remoteDir = `${config.sftpUrl}/upload-test/sub1`;
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      { name: 'sub2', type: 'd' },
      { name: 'file4.txt.gz', type: '-', size: 570314 },
      { name: 'file3.txt', type: '-' },
    ]);
  });
});

describe('Uploaddir bad path tests', function () {
  let sftp;

  before('UploadDir bad path setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('UploadDir bad path clenaup hook', async function () {
    await sftp.end();
    return true;
  });

  it('Non-existent source directory is rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'no-such-dir');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(/Bad path/);
  });

  it('Source directory is a file rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /not a directory/,
    );
  });

  it('Destination directory is a file rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/upload-test/file1.txt`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(/Bad path/);
  });
});
