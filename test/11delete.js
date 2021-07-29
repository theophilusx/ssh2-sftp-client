'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {deleteSetup} = require('./hooks/delete-hooks');
const {lastRemoteDir} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('delete() method tests', function () {
  let sftp;

  before('delete() tests setup hook', async function () {
    sftp = await getConnection();
    await deleteSetup(sftp, config.sftpUrl);
    return true;
  });

  after('delete() cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it('delete returns a promise', function () {
    return expect(sftp.delete(`${config.sftpUrl}/delete-promise.md`)).to.be.a(
      'promise'
    );
  });

  it('delete a file', function () {
    return expect(
      sftp.delete(`${config.sftpUrl}/delete-file.md`)
    ).to.eventually.equal(
      `Successfully deleted ${config.sftpUrl}/delete-file.md`
    );
  });

  it('delete non-existent file is rejected', function () {
    return expect(
      sftp.delete(`${config.sftpUrl}/no-such-file.txt`)
    ).to.be.rejectedWith('No such file');
  });

  it('delete with relative path 1', function () {
    return expect(
      sftp.delete('./testServer/delete-relative1.txt')
    ).to.eventually.equal(
      'Successfully deleted ./testServer/delete-relative1.txt'
    );
  });

  it('delete with relative path 2', function () {
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/delete-relative2.txt`;
    return expect(sftp.delete(remotePath)).to.eventually.equal(
      `Successfully deleted ${remotePath}`
    );
  });
});
