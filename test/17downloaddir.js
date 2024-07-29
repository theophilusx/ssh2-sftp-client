const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks.js');
const { rmSync, rmdirSync, mkdirSync, chmodSync } = require('node:fs');
const { basename } = require('node:path');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

const rmdir = rmSync ? rmSync : rmdirSync;

const myFilter = (f) => {
  return basename(f).startsWith('.') ? false : true;
};

describe('17downloaddir: Download directory', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    let localDir = makeLocalPath(config.localUrl, 'no-perm-dir');
    mkdirSync(localDir, { recursive: true });
    chmodSync(localDir, 0o111);
    return true;
  });

  after('download directory clenaup hook', async function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test2');
    rmdir(localDir, { recursive: true });
    localDir = makeLocalPath(config.localUrl, 'no-perm-dir');
    chmodSync(localDir, 0o666);
    rmdir(localDir, { recursive: true });
    await sftp.end();
    return true;
  });

  it('Download directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.eventually.equal(
      `${remoteDir} downloaded to ${localDir}`,
    );
  });

  it('Download filtered directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test2');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, { filter: myFilter }),
    ).to.eventually.equal(`${remoteDir} downloaded to ${localDir}`);
  });

  it('Bad src directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'not-needed');
    let remoteDir = `${config.sftpUrl}/no-such-dir`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith(
      'No such file',
    );
  });

  it('Bad dst directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith('Bad path');
  });

  it('Bad dst permissions', function () {
    let localDir = makeLocalPath(config.localUrl, 'no-perm-dir');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith(/Bad path/);
  });
});

describe('17downloaddir C: ownload directory using fastGet', function () {
  let sftp;

  before('Download directory setup hook', async function () {
    sftp = await getConnection();
    let localDir = makeLocalPath(config.localUrl, 'no-perm-dir');
    mkdirSync(localDir, { recursive: true });
    chmodSync(localDir, 0o111);
    return true;
  });

  after('download directory clenaup hook', async function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test2');
    rmdir(localDir, { recursive: true });
    localDir = makeLocalPath(config.localUrl, 'no-perm-dir');
    chmodSync(localDir, 0o666);
    rmdir(localDir, { recursive: true });
    await sftp.end();
    return true;
  });

  it('Download directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, { useFastget: true }),
    ).to.eventually.equal(`${remoteDir} downloaded to ${localDir}`);
  });

  it('Download filtered directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test2');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, {
        filter: myFilter,
        useFastget: true,
      }),
    ).to.eventually.equal(`${remoteDir} downloaded to ${localDir}`);
  });

  it('Bad src directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'not-needed');
    let remoteDir = `${config.sftpUrl}/no-such-dir`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, { useFastget: true }),
    ).to.be.rejectedWith('No such file');
  });

  it('Bad dst directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, { useFastget: true }),
    ).to.be.rejectedWith('Bad path');
  });

  it('Bad dst permissions', function () {
    let localDir = makeLocalPath(config.localUrl, 'no-perm-dir');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(
      sftp.downloadDir(remoteDir, localDir, { useFastget: true }),
    ).to.be.rejectedWith(/Bad path/);
  });
});

describe('17downloaddir D: Partial download dir', function () {
  let sftp;

  before('Partial download directory setup hook', async function () {
    sftp = await getConnection();
    let localDir = makeLocalPath(config.localUrl, 'download-test', 'sub1');
    rmdir(localDir, { recursive: true });
    return true;
  });

  after('Partial download directory clenaup hook', async function () {
    let remoteDir = `${config.sftpUrl}/upload-test`;
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    await sftp.rmdir(remoteDir, true);
    rmdir(localDir, { recursive: true });
    await sftp.end();
    return true;
  });

  it('Download partial directory', function () {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = `${config.sftpUrl}/upload-test`;
    return expect(sftp.downloadDir(remoteDir, localDir)).to.eventually.equal(
      `${remoteDir} downloaded to ${localDir}`,
    );
  });
});
