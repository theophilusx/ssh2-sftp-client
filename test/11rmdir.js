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
const rHooks = require('./hooks/rmdir-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Rmdir method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Rmdir setup hook', async function() {
    hookSftp = await getConnection('rmdir-hook');
    sftp = await getConnection('rmdir');
    await rHooks.rmdirSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('mkdir cleanup hook', async function() {
    await closeConnection('mkdir', sftp);
    await closeConnection('rmdir-hook', hookSftp);
    return true;
  });

  it('Rmdir should return a promise', function() {
    return expect(sftp.rmdir(join(config.sftpUrl, 'mocha'))).to.be.a('promise');
  });

  it('Rmdir on non-existent directory should be rejected', function() {
    return expect(
      sftp.rmdir(join(config.sftpUrl, 'mocha-rmdir2'), true)
    ).to.be.rejectedWith('No such file');
  });

  it('Rmdir without recursion on empty directory', function() {
    return expect(
      sftp.rmdir(join(config.sftpUrl, 'mocha-rmdir', 'dir1'))
    ).to.eventually.equal('Successfully removed directory');
  });

  it('Rmdirrecursively remove all directories', function() {
    return expect(
      sftp.rmdir(join(config.sftpUrl, 'mocha-rmdir', 'dir3'), true)
    ).to.eventually.equal('Successfully removed directory');
  });

  it('Rmdir recursively remove dirs and files', function() {
    return expect(
      sftp.rmdir(join(config.sftpUrl, 'mocha-rmdir'), true)
    ).to.eventually.equal('Successfully removed directory');
  });
});

describe('permission tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('permission test setup hook', async function() {
    hookSftp = await getConnection('rmdir-permission-hook');
    sftp = await getConnection('rmdir-permission');
    return true;
  });

  after('permission test cleanup hook', async function() {
    await closeConnection('rmdir-permissions', sftp);
    await closeConnection('rmdir-permission-hook', hookSftp);
    return true;
  });

  it('fail to remove dir with root sub-dir', function() {
    return expect(
      sftp.rmdir(join(config.sftpUrl, 'perm-test', 'dir-t1'))
    ).to.be.rejectedWith('Failure');
  });

  it('fail to remove dir without permisisons', function() {
    return expect(
      sftp.rmdir(join(config.sftpUrl, 'perm-test', 'dir-t2'))
    ).to.be.rejectedWith('Failure');
  });
});
