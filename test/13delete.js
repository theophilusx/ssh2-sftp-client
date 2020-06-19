'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {deleteSetup} = require('./hooks/delete-hooks');
const {makeRemotePath, splitRemotePath} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('delete() method tests', function () {
  let sftp;

  // before(function(done) {
  //   setTimeout(function() {
  //     done();
  //   }, config.delay);
  // });

  before('delete tests setup hook', async function () {
    sftp = await getConnection();
    await deleteSetup(sftp, config.sftpUrl);
    return true;
  });

  after('delete cleanup hook', async function () {
    return true;
  });

  it('delete returns a promise', function () {
    return expect(
      sftp.delete(makeRemotePath(config.sftpUrl, 'delete-promise.md'))
    ).to.be.a('promise');
  });

  it('delete a file', function () {
    return expect(
      sftp.delete(makeRemotePath(config.sftpUrl, 'delete-file.md'))
    ).to.eventually.equal('Successfully deleted file');
  });

  it('delete non-existent file is rejected', function () {
    return expect(
      sftp.delete(makeRemotePath(config.sftpUrl, 'no-such-file.txt'))
    ).to.be.rejectedWith('No such file');
  });

  it('delete with relative path 1', function () {
    return expect(
      sftp.delete('./testServer/delete-relative1.txt')
    ).to.eventually.equal('Successfully deleted file');
  });

  it('delete with relative path 2', function () {
    let remotePath = makeRemotePath(
      '..',
      splitRemotePath(config.sftpUrl)[1],
      'testServer',
      'delete-relative2.txt'
    );
    return expect(sftp.delete(remotePath)).to.eventually.equal(
      'Successfully deleted file'
    );
  });
});
