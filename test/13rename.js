'use strict';

// smaller utility method tests

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
const rnHooks = require('./hooks/rename-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Rename method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Rename setup hook', async function() {
    hookSftp = await getConnection('rename-hook');
    sftp = await getConnection('rename');
    await rnHooks.renameSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('Rename cleanup hook', async function() {
    await rnHooks.renameCleanup(hookSftp, config.sftpUrl);
    await closeConnection('rename', sftp);
    await closeConnection('rename-hook', hookSftp);
    return true;
  });

  it('Rename should return a promise', function() {
    return expect(
      sftp.rename(
        join(config.sftpUrl, 'mocha-rename.md'),
        join(config.sftpUrl, 'mocha-rename.txt')
      )
    ).to.be.a('promise');
  });

  it('Rename file successfully', function() {
    return sftp
      .rename(
        join(config.sftpUrl, 'mocha-rename.txt'),
        join(config.sftpUrl, 'mocha-rename-new.md')
      )
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'mocha-rename-new.md'}]);
      });
  });

  it('Rename non-existent file is rejected', function() {
    return expect(
      sftp.rename(
        join(config.sftpUrl, 'no-such-file.txt'),
        join(config.sftpUrl, 'dummy.md')
      )
    ).to.be.rejectedWith('No such file');
  });

  it('Rename to existing file name is rejected', function() {
    return expect(
      sftp.rename(
        join(config.sftpUrl, 'mocha-rename-new.md'),
        join(config.sftpUrl, 'mocha-conflict.md')
      )
    ).to.be.rejectedWith('Failure');
  });
});
