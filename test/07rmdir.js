'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {rmdirSetup} = require('./hooks/rmdir-hooks');
const {lastRemoteDir} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('rmdir() method tests', function () {
  let sftp;

  before('rmdir() setup hook', async function () {
    sftp = await getConnection();
    await rmdirSetup(sftp, config.sftpUrl);
    return true;
  });

  after('rmdir() cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it('rmdir should return a promise', function () {
    return expect(sftp.rmdir(`${config.sftpUrl}/rmdir-promise`)).to.be.a(
      'promise'
    );
  });

  it('rmdir on non-existent directory should be rejected', function () {
    return expect(
      sftp.rmdir(`${config.sftpUrl}/rmdir-not-exist`, true)
    ).to.be.rejectedWith('No such file');
  });

  it('rmdir without recursion on empty directory', function () {
    return expect(
      sftp.rmdir(`${config.sftpUrl}/rmdir-empty`)
    ).to.eventually.equal('Successfully removed directory');
  });

  it('rmdir recursively remove all directories', function () {
    return expect(
      sftp.rmdir(`${config.sftpUrl}/rmdir-non-empty/dir3`, true)
    ).to.eventually.equal('Successfully removed directory');
  });

  it('rmdir recursively remove dirs and files', function () {
    return expect(
      sftp.rmdir(`${config.sftpUrl}/rmdir-non-empty`, true)
    ).to.eventually.equal('Successfully removed directory');
  });

  it('rmdir with relative path 1', function () {
    return expect(
      sftp.rmdir('./testServer/rmdir-relative1')
    ).to.eventually.equal('Successfully removed directory');
  });

  it('rmdir with relative path 2', function () {
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/rmdir-relative2`;
    return expect(sftp.rmdir(remotePath)).to.eventually.equal(
      'Successfully removed directory'
    );
  });
});
