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
const dHooks = require('./hooks/delete-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Delete method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Delete tests setup hook', async function() {
    hookSftp = await getConnection('delete-hook');
    sftp = await getConnection('delete');
    await dHooks.deleteSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('delete cleanup hook', async function() {
    await closeConnection('delete', sftp);
    await closeConnection('delete-hook', hookSftp);
    return true;
  });

  it('Delete returns a promise', function() {
    return expect(
      sftp.delete(join(config.sftpUrl, 'mocha-delete-promise.md'))
    ).to.be.a('promise');
  });

  it('Delete a file', function() {
    return expect(
      sftp.delete(join(config.sftpUrl, 'mocha-delete.md'))
    ).to.eventually.equal('Successfully deleted file');
  });

  it('Delete non-existent file is rejected', function() {
    return expect(
      sftp.delete(join(config.sftpUrl, 'no-such-file.txt'))
    ).to.be.rejectedWith('No such file');
  });
});
