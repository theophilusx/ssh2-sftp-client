'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks');
const fs = require('node:fs/promises');
const { basename } = require('node:path');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

const remoteBulkData = `${config.sftpUrl}/bulk-data`;
const localBulkData = makeLocalPath(config.localUrl, 'bulk-uploads');
const noPermDir = makeLocalPath(config.localUrl, 'no-perm-dir');
const downloadTestDir = makeLocalPath(config.localUrl, 'download-test2');
const subDir = makeLocalPath(config.localUrl, 'download-test2', 'subdir-1');
const subSubDir = makeLocalPath(
  config.localUrl,
  'download-test2',
  'subdir-2',
  'subsubdir-2',
);

describe('Download directory with get', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    await sftp.uploadDir(localBulkData, remoteBulkData);
    await fs.mkdir(noPermDir, { recursive: true });
    await fs.chmod(noPermDir, 0o111);
    return true;
  });

  after('download directory clenaup hook', async function () {
    await fs.chmod(noPermDir, 0o666);
    await fs.rm(noPermDir, { recursive: true });
    await sftp.rmdir(remoteBulkData, { recursive: true });
    await sftp.end();
    return true;
  });

  afterEach('download test cleanup', async function () {
    try {
      await fs.rm(downloadTestDir, { recursive: true });
    } catch (e) {
      console.log(`downloaddir test cleanup error: ${e.message}`);
      return true;
    }
  });

  it('Download directory', async function () {
    const resp = await sftp.downloadDir(remoteBulkData, downloadTestDir);
    expect(resp).to.equal(`${remoteBulkData} downloaded to ${downloadTestDir}`);
    const dirList = await fs.readdir(downloadTestDir, { withFileTypes: true });
    const files1 = dirList.filter((e) => e.isFile());
    const dirs1 = dirList.filter((e) => e.isDirectory());
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    const dirList2 = await fs.readdir(subDir, { withFileTypes: true });
    const files2 = dirList2.filter((e) => e.isFile());
    const dirs2 = dirList2.filter((e) => e.isDirectory());
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    const dirList3 = await fs.readdir(subSubDir, { withFileTypes: true });
    const files3 = dirList3.filter((e) => e.isFile());
    const dirs3 = dirList3.filter((e) => e.isDirectory());
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0), { withFileTypes: true };
  });

  it('Download directory with filter', async function () {
    const re = /.*file-1.\.txt/;
    let resp = await sftp.downloadDir(remoteBulkData, downloadTestDir, {
      filter: (file, isDir) => {
        return isDir ? true : re.test(file);
      },
    });
    expect(resp).to.equal(`${remoteBulkData} downloaded to ${downloadTestDir}`);
    const dirList = await fs.readdir(downloadTestDir, { withFileTypes: true });
    const files1 = dirList.filter((e) => e.isFile());
    const dirs1 = dirList.filter((e) => e.isDirectory());
    expect(files1.length).to.equal(10);
    expect(dirs1.length).to.equal(4);
    const dirList2 = await fs.readdir(subDir, { withFileTypes: true });
    const files2 = dirList2.filter((e) => e.isFile());
    const dirs2 = dirList2.filter((e) => e.isDirectory());
    expect(files2.length).to.equal(0);
    expect(dirs2.length).to.equal(3);
    const dirList3 = await fs.readdir(subSubDir, { withFileTypes: true });
    const files3 = dirList3.filter((e) => e.isFile());
    const dirs3 = dirList3.filter((e) => e.isDirectory());
    expect(files3.length).to.equal(0);
    return expect(dirs3.length).to.equal(0), { withFileTypes: true };
  });
});

describe('Download directory with get', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    await sftp.uploadDir(localBulkData, remoteBulkData);
    await fs.mkdir(noPermDir, { recursive: true });
    await fs.chmod(noPermDir, 0o111);
    return true;
  });

  after('download directory clenaup hook', async function () {
    await fs.chmod(noPermDir, 0o666);
    await fs.rm(noPermDir, { recursive: true });
    await sftp.rmdir(remoteBulkData, { recursive: true });
    await sftp.end();
    return true;
  });

  afterEach('download test cleanup', async function () {
    try {
      await fs.rm(downloadTestDir, { recursive: true });
    } catch (e) {
      console.log(`downloaddir test cleanup error: ${e.message}`);
      return true;
    }
  });

  it('Download directory', async function () {
    const resp = await sftp.downloadDir(remoteBulkData, downloadTestDir, {
      useFastGet: true,
    });
    expect(resp).to.equal(`${remoteBulkData} downloaded to ${downloadTestDir}`);
    const dirList = await fs.readdir(downloadTestDir, { withFileTypes: true });
    const files1 = dirList.filter((e) => e.isFile());
    const dirs1 = dirList.filter((e) => e.isDirectory());
    expect(files1.length).to.equal(100);
    expect(dirs1.length).to.equal(4);
    const dirList2 = await fs.readdir(subDir, { withFileTypes: true });
    const files2 = dirList2.filter((e) => e.isFile());
    const dirs2 = dirList2.filter((e) => e.isDirectory());
    expect(files2.length).to.equal(100);
    expect(dirs2.length).to.equal(3);
    const dirList3 = await fs.readdir(subSubDir, { withFileTypes: true });
    const files3 = dirList3.filter((e) => e.isFile());
    const dirs3 = dirList3.filter((e) => e.isDirectory());
    expect(files3.length).to.equal(100);
    return expect(dirs3.length).to.equal(0), { withFileTypes: true };
  });

  it('Download directory with filter', async function () {
    const re = /.*file-1.\.txt/;
    let resp = await sftp.downloadDir(remoteBulkData, downloadTestDir, {
      useFastGet: true,
      filter: (file, isDir) => {
        return isDir ? true : re.test(file);
      },
    });
    expect(resp).to.equal(`${remoteBulkData} downloaded to ${downloadTestDir}`);
    const dirList = await fs.readdir(downloadTestDir, { withFileTypes: true });
    const files1 = dirList.filter((e) => e.isFile());
    const dirs1 = dirList.filter((e) => e.isDirectory());
    expect(files1.length).to.equal(10);
    expect(dirs1.length).to.equal(4);
    const dirList2 = await fs.readdir(subDir, { withFileTypes: true });
    const files2 = dirList2.filter((e) => e.isFile());
    const dirs2 = dirList2.filter((e) => e.isDirectory());
    expect(files2.length).to.equal(0);
    expect(dirs2.length).to.equal(3);
    const dirList3 = await fs.readdir(subSubDir, { withFileTypes: true });
    const files3 = dirList3.filter((e) => e.isFile());
    const dirs3 = dirList3.filter((e) => e.isDirectory());
    expect(files3.length).to.equal(0);
    return expect(dirs3.length).to.equal(0), { withFileTypes: true };
  });
});

describe('Download dir with bad targets', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    await sftp.uploadDir(localBulkData, remoteBulkData);
    await fs.mkdir(noPermDir, { recursive: true });
    await fs.chmod(noPermDir, 0o111);
    return true;
  });

  after('download directory clenaup hook', async function () {
    await fs.chmod(noPermDir, 0o666);
    await fs.rm(noPermDir, { recursive: true });
    await sftp.rmdir(remoteBulkData, { recursive: true });
    await sftp.end();
    return true;
  });

  it('Bad src directory', async function () {
    let remoteDir = `${config.sftpUrl}/no-such-dir`;
    return expect(sftp.downloadDir(remoteDir, downloadTestDir)).to.be.rejectedWith(
      'No such file',
    );
  });

  it('Bad dst directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    return expect(sftp.downloadDir(remoteBulkData, localDir)).to.be.rejectedWith(
      'Bad path',
    );
  });

  it('Bad dst permissions', function () {
    return expect(sftp.downloadDir(remoteBulkData, noPermDir)).to.be.rejectedWith(
      /Bad path/,
    );
  });
});
