'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {mixedSetup, mixedCleanup} = require('./hooks/mixed-hooks');

chai.use(chaiAsPromised);

describe('Mixed tests', function () {
  let sftp;

  before('Mixed test setup hook', async function () {
    sftp = await getConnection();
    await mixedSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('Mixed test cleanup hook', async function () {
    await mixedCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  describe('realPath tests', function () {
    it('returns path to test directory', async function () {
      return expect(
        sftp.realPath(config.sftpUrl + '/path-test-dir')
      ).to.eventually.equal(config.sftpUrl + '/path-test-dir');
    });

    it('return path to test file 1', async function () {
      return expect(
        sftp.realPath(config.sftpUrl + '/path-test-dir/path-file1.txt')
      ).to.eventually.equal(config.sftpUrl + '/path-test-dir/path-file1.txt');
    });

    it('return path to test file 2', async function () {
      return expect(
        sftp.realPath(config.sftpUrl + '/path-test-dir/path-file2.txt.gz')
      ).to.eventually.equal(
        config.sftpUrl + '/path-test-dir/path-file2.txt.gz'
      );
    });

    // realPath for windows does not seem to return empty string for non-existent paths
    it("realPath returns '' for non-existing path", function () {
      if (sftp.remotePlatform !== 'win32') {
        return expect(
          sftp.realPath(
            config.sftpUrl +
              '/path-test-dir/path-not-exist-dir/path-not-exist-file.txt'
          )
        ).to.eventually.equal('');
      } else {
        return expect(true).to.equal(true);
      }
    });
  });
});
