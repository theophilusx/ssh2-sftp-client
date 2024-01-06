'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks');
const Client = require('../src/index.js');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

const localDir = makeLocalPath(config.localUrl, 'bulk-uploads');
const remoteDir = `${config.sftpUrl}/bulk-uploads`;
const remoteSubDir = `${config.sftpUrl}/bulk-uploads/subdir-0`;
const remoteSubSubDir = `${config.sftpUrl}/bulk-uploads/subdir-1/subsubdir-1`;

describe('uploadDir tests with put', function () {
  let sftp;

  before('uploadDir tests setup hook', async function () {
    try {
      sftp = await getConnection();
      return true;
    } catch (e) {
      console.log(`test setup error: ${e.message}`);
      return false;
    }
  });

  after('UploadDir tests clenaup hook', async function () {
    try {
      //await sftp.rmdir(remoteDir, true);
      await sftp.end();
      return true;
    } catch (e) {
      console.log(`Test Cleanup hook: ${e.message}`);
      return true;
    }
  });

  afterEach('Per test cleanup', async function () {
    try {
      await sftp.rmdir(remoteDir, true);
    } catch (e) {
      console.log(`Pre-test hook: ${e.message}`);
      return true;
    }
  });

  it('Upload directory', async function () {
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('Upload directory with filter', async function () {
    const re = /.*file-1.\.txt/;
    let result = await sftp.uploadDir(localDir, remoteDir, {
      filter: (file, isDir) => {
        return isDir ? true : re.test(file);
      },
    });
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(10);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(0);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(0);
    return expect(dirs3.length).to.equal(0);
  });
});

describe('uploadDir tests with fastPut', function () {
  let sftp;

  before('uploadDir tests setup hook', async function () {
    try {
      sftp = await getConnection();
      return true;
    } catch (e) {
      console.log(`test setup error: ${e.message}`);
      return false;
    }
  });

  after('UploadDir tests clenaup hook', async function () {
    try {
      //await sftp.rmdir(remoteDir, true);
      await sftp.end();
      return true;
    } catch (e) {
      console.log(`Test Cleanup hook: ${e.message}`);
      return true;
    }
  });

  afterEach('Per test cleanup', async function () {
    try {
      await sftp.rmdir(remoteDir, true);
    } catch (e) {
      console.log(`Pre-test hook: ${e.message}`);
      return true;
    }
  });

  it('Upload directory', async function () {
    let result = await sftp.uploadDir(localDir, remoteDir, {
      useFastPut: true,
    });
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('Upload directory with filter', async function () {
    const re = /.*file-1.\.txt/;
    let result = await sftp.uploadDir(localDir, remoteDir, {
      useFastPut: true,
      filter: (file, isDir) => {
        return isDir ? true : re.test(file);
      },
    });
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(10);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(0);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(0);
    return expect(dirs3.length).to.equal(0);
  });
});

describe('Uploaddir bad path tests', function () {
  let sftp;

  before('UploadDir bad path setup hook', async function () {
    sftp = await getConnection();
    await sftp.fastPut(
      makeLocalPath(config.localUrl, 'test-file1.txt'),
      `${config.sftpUrl}/bad-target`,
    );
    return true;
  });

  after('UploadDir bad path clenaup hook', async function () {
    await sftp.delete(`${config.sftpUrl}/bad-target`);
    await sftp.end();
    return true;
  });

  it('Non-existent source directory is rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'no-such-dir');
    let remoteDir = `${config.sftpUrl}/upload-test1`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(/Bad path/);
  });

  it('Source directory is a file rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = `${config.sftpUrl}/upload-test2`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /not a directory/,
    );
  });

  it('Destination directory is a file rejected', function () {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = `${config.sftpUrl}/bad-target`;
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(/Bad path/);
  });
});

describe('Upload with various promise limits', function () {
  it('upload with 1 promise', async function () {
    let cfg = { ...config, promiseLimit: 1 };
    let sftp = new Client();
    await sftp.connect(cfg);
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    await sftp.rmdir(remoteDir, true);
    await sftp.end();
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('upload with 10 promise', async function () {
    let cfg = { ...config, promiseLimit: 10 };
    let sftp = new Client();
    await sftp.connect(cfg);
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    await sftp.rmdir(remoteDir, true);
    await sftp.end();
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('upload with 20 promise', async function () {
    let cfg = { ...config, promiseLimit: 20 };
    let sftp = new Client();
    await sftp.connect(cfg);
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    await sftp.rmdir(remoteDir, true);
    await sftp.end();
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('upload with 40 promise', async function () {
    let cfg = { ...config, promiseLimit: 40 };
    let sftp = new Client();
    await sftp.connect(cfg);
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    await sftp.rmdir(remoteDir, true);
    await sftp.end();
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('upload with 80 promise', async function () {
    let cfg = { ...config, promiseLimit: 80 };
    let sftp = new Client();
    await sftp.connect(cfg);
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    await sftp.rmdir(remoteDir, true);
    await sftp.end();
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });

  it('upload with 160 promise', async function () {
    let cfg = { ...config, promiseLimit: 160 };
    let sftp = new Client();
    await sftp.connect(cfg);
    let result = await sftp.uploadDir(localDir, remoteDir);
    expect(result).to.equal(`${localDir} uploaded to ${remoteDir}`);
    let dirList = await sftp.list(remoteDir);
    let files1 = dirList.filter((e) => e.type === '-');
    let dirs1 = dirList.filter((e) => e.type === 'd');
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    let dirList2 = await sftp.list(remoteSubDir);
    let files2 = dirList2.filter((e) => e.type === '-');
    let dirs2 = dirList2.filter((e) => e.type === 'd');
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    let fileList3 = await sftp.list(remoteSubSubDir);
    await sftp.rmdir(remoteDir, true);
    await sftp.end();
    let files3 = fileList3.filter((e) => e.type === '-');
    let dirs3 = fileList3.filter((e) => e.type === 'd');
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0);
  });
});
