'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {deleteSetup} = require('./hooks/delete-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('delete() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('delete tests setup hook', async function() {
    hookSftp = await getConnection('delete-hook');
    sftp = await getConnection('delete');
    await deleteSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('delete cleanup hook', async function() {
    await closeConnection('delete', sftp);
    await closeConnection('delete-hook', hookSftp);
    return true;
  });

  it('delete returns a promise', function() {
    return expect(
      sftp.delete(join(config.sftpUrl, 'delete-promise.md'))
    ).to.be.a('promise');
  });

  it('delete a file', function() {
    return expect(
      sftp.delete(join(config.sftpUrl, 'delete-file.md'))
    ).to.eventually.equal('Successfully deleted file');
  });

  it('delete non-existent file is rejected', function() {
    return expect(
      sftp.delete(join(config.sftpUrl, 'no-such-file.txt'))
    ).to.be.rejectedWith('No such file');
  });

  it('delete with relative path 1', function() {
    return expect(
      sftp.delete('./testServer/delete-relative1.txt')
    ).to.eventually.equal('Successfully deleted file');
  });

  it('delete with relative path 2', function() {
    return expect(
      sftp.delete(`../${config.username}/testServer/delete-relative2.txt`)
    ).to.eventually.equal('Successfully deleted file');
  });
});
