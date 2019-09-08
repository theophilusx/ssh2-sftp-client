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
const {existSetup, existCleanup} = require('./hooks/exist-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('exists() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('exists() test setup hook', async function() {
    hookSftp = await getConnection('exist-hook');
    sftp = await getConnection('exist');
    await existSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('exist() test cleanup hook', async function() {
    await existCleanup(hookSftp, config.sftpUrl);
    await closeConnection('exist', sftp);
    await closeConnection('exist-hook', hookSftp);
    return true;
  });

  it('exist return should be a promise', function() {
    return expect(sftp.exists(config.sftpUrl)).to.be.a('promise');
  });

  it('exists returns truthy for existing directory', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'exist-test-dir'))
    ).to.eventually.equal('d');
  });

  it('exist returns truthy for existing file', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'exist-file.txt'))
    ).to.eventually.equal('-');
  });

  it('exist returns true for file in sub-dir', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'exist-test-dir', 'exist-gzip.txt.gz'))
    ).to.eventually.equal('-');
  });

  it('exist returns true for "." dir', function() {
    return expect(sftp.exists('.')).to.eventually.equal('d');
  });

  it('exists returns true for relative path on existing dir', function() {
    return expect(
      sftp.exists('./testServer/exist-test-dir')
    ).to.eventually.equal('d');
  });

  it('Exists return false value for non existent dir', function() {
    return expect(
      sftp.exists(join(config.sftpUrl, 'no-such-dir/subdir'))
    ).to.eventually.equal(false);
  });

  it('exists return false for bad path', function() {
    return expect(sftp.exists('just/a/really/bad/path')).to.eventually.equal(
      false
    );
  });
});
