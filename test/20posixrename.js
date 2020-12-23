'use strict';

// smaller utility method tests

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection, lastRemoteDir} = require('./hooks/global-hooks');
const {renameSetup, renameCleanup} = require('./hooks/rename-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('posixRename() method tests', function () {
  let sftp;

  before('posixrename() setup hook', async function () {
    sftp = await getConnection();
    await renameSetup(sftp, config.sftpUrl);
    return true;
  });

  after('posixrename() cleanup hook', async function () {
    await renameCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('rename should return a promise', function () {
    let from = `${config.sftpUrl}/rename-promise.md`;
    let to = `${config.sftpUrl}/rename-promise2.txt`;
    let p = sftp.posixRename(from, to);
    expect(p).to.be.a('promise');
    return expect(p).to.eventually.equal(
      `Successful POSIX rename ${from} to ${to}`
    );
  });

  it('rename non-existent file is rejected', function () {
    return expect(
      sftp.posixRename(
        `${config.sftpUrl}/no-such-file.txt`,
        `${config.sftpUrl}/dummy.md`
      )
    ).to.be.rejectedWith('No such file');
  });

  it('rename file successfully', function () {
    return sftp
      .posixRename(
        `${config.sftpUrl}/rename-promise2.txt`,
        `${config.sftpUrl}/rename-new.md`
      )
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'rename-new.md'}]);
      });
  });

  it('rename to existing file name is successful', function () {
    return sftp
      .posixRename(
        `${config.sftpUrl}/rename-new.md`,
        `${config.sftpUrl}/rename-conflict.md`
      )
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        expect(list).to.not.containSubset([{name: 'rename-new.md'}]);
        return expect(list).to.containSubset([{name: 'rename-conflict.md'}]);
      });
  });

  it('rename with relative source 1', function () {
    return sftp
      .posixRename(
        './testServer/rename-conflict.md',
        `${config.sftpUrl}/rename-relative1.md`
      )
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'rename-relative1.md'}]);
      });
  });

  it('rename with relative source 2', function () {
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/rename-relative1.md`;
    return sftp
      .posixRename(remotePath, `${config.sftpUrl}/rename-relative2.md`)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'rename-relative2.md'}]);
      });
  });

  it('rename with relative destination 3', function () {
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/rename-relative3.md`;
    return sftp
      .posixRename(`${config.sftpUrl}/rename-relative2.md`, remotePath)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'rename-relative3.md'}]);
      });
  });

  it('rename with relative destination 4', function () {
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/rename-relative4.md`;
    return sftp
      .posixRename(`${config.sftpUrl}/rename-relative3.md`, remotePath)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'rename-relative4.md'}]);
      });
  });
});
