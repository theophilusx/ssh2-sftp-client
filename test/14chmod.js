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
const cHooks = require('./hooks/chmod-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Chmod method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Chmod setup hook', async function() {
    hookSftp = await getConnection('chmod-hook');
    sftp = await getConnection('chmod');
    await cHooks.chmodSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('Chmod cleanup hook', async function() {
    await cHooks.chmodCleanup(hookSftp, config.sftpUrl);
    await closeConnection('chmod', sftp);
    await closeConnection('chmod-hook', hookSftp);
    return true;
  });

  it('Chmod should return a promise', function() {
    return expect(
      sftp.chmod(join(config.sftpUrl, 'mocha-chmod.txt'), 0o444)
    ).to.be.a('promise');
  });

  it('Chmod on a file reports correct mode', function() {
    return sftp
      .chmod(join(config.sftpUrl, 'mocha-chmod.txt'), 0o777)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'mocha-chmod.txt',
            rights: {
              user: 'rwx',
              group: 'rwx',
              other: 'rwx'
            }
          }
        ]);
      });
  });

  it('Chmod on non-existent file is rejecterd', function() {
    return expect(
      sftp.chmod(join(config.sftpUrl, 'does-not-exist.txt'), 0o777)
    ).to.be.rejectedWith('No such file');
  });
});
