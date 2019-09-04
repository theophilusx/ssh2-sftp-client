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
const eHooks = require('./hooks/exist-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Exist method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Exist test setup hook', async function() {
    hookSftp = await getConnection('exist-hook');
    sftp = await getConnection('exist');
    await eHooks.existSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('Exist test cleanup hook', async function() {
    await eHooks.existCleanup(hookSftp, config.sftpUrl);
    await closeConnection('exist', sftp);
    await closeConnection('exist-hook', hookSftp);
    return true;
  });

  it('Exist return should be a promise', function() {
    return expect(sftp.exists(config.sftpUrl)).to.be.a('promise');
  });

  it('Exist returns truthy for existing directory', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'exist-dir'))
    ).to.eventually.equal('d');
  });

  it('Exist returns truthy for existing file', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'exist-file.txt'))
    ).to.eventually.equal('-');
  });

  it('Exists return false value for non existent object', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'no-such-dir/subdir'))
    ).to.eventually.equal(false);
  });

  it('Exists return false for bad path', function() {
    return expect(sftp.exists('just/a/really/bad/path')).to.eventually.equal(
      false
    );
  });
});
