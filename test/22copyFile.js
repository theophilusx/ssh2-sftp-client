'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const zlib = require('zlib');
const {
  config,
  getConnection,
  makeLocalPath,
} = require('./hooks/global-hooks');
const { copyFileSetup, copyFileCleanup } = require('./hooks/copyFile-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('copyFile() method tests', function () {
  let sftp;

  before('copyFile() setup hook', async function () {
    sftp = await getConnection();
    await copyFileSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('copyFile() cleanup hook', async function () {
    await copyFileCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('copyFile big text file', async function () {
    const src = `${config.sftpUrl}/copyFile-large.txt`;
    const dst = `${config.sftpUrl}/copyFile-large-copy.txt`;
    await sftp.copyFile(src, dst);
    const srcStats = await sftp.stat(src);
    const dstStats = await sftp.stat(dst);
    return expect(srcStats.size).to.equal(dstStats.size);
  });

  it('copyFile big text file and transform', async function () {
    const src = `${config.sftpUrl}/copyFile-large.txt`;
    const dst = `${config.sftpUrl}/copyFile-large.txt.gz`;
    const localPath = makeLocalPath(config.localUrl, 'copyFile-unzip.txt');
    const transform = zlib.createGzip();
    await sftp.copyFile(src, dst, transform);

    const gunzip = zlib.createGunzip();
    const out = fs.createWriteStream(localPath, {
      flags: 'w',
      encoding: null,
    });
    gunzip.pipe(out);
    await sftp.get(src, out);

    const srcStats = await sftp.stat(src);
    const dstStats = fs.statSync(localPath);
    return expect(srcStats.size).to.equal(dstStats.size);
  });

  it('copyFile should overwrite dst file if it already exists', async function () {
    const src = `${config.sftpUrl}/copyFile-large.txt`;
    const dst = `${config.sftpUrl}/copyFile-already-exists.txt`;
    await sftp.copyFile(src, dst);
    const srcStats = await sftp.stat(src);
    const dstStats = await sftp.stat(dst);
    return expect(srcStats.size).to.equal(dstStats.size);
  });

  it('copyFile src file does not exist', async function () {
    const src = `${config.sftpUrl}/copyFile-does-not-exist.txt`;
    const dst = `${config.sftpUrl}/copyFile-does-not-exist-copy.txt`;
    return expect(sftp.copyFile(src, dst)).to.be.rejectedWith(
      `No such file ${src}`
    );
  });

  it('copyFile src is not a file', async function () {
    const src = `${config.sftpUrl}/`;
    const dst = `${config.sftpUrl}/copyFile-large-copy.txt`;
    return expect(sftp.copyFile(src, dst)).to.be.rejectedWith(
      `Not a regular file ${src}`
    );
  });
});
