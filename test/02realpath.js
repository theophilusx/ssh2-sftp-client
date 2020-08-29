'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {pathSetup, pathCleanup} = require('./hooks/path-hooks');

chai.use(chaiAsPromised);

describe('Path tests', function () {
  let sftp;

  before('Exist test setup hook', async function () {
    sftp = await getConnection();
    await pathSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('Exist test cleanup hook', async function () {
    await pathCleanup(sftp, config.sftpUrl);
    return true;
  });

  it(`Resolves absolute path ${config.sftpUrl}`, function () {
    return expect(sftp.realPath(config.sftpUrl)).to.eventually.equal(
      config.sftpUrl
    );
  });

  it('Resolve "." relative path', async function () {
    let absPath = await sftp.realPath('.');
    return expect(config.sftpUrl.startsWith(absPath)).to.equal(true);
  });

  it('Resolve ".." relative path', async function () {
    let absPath = await sftp.realPath('..');
    return expect(config.sftpUrl.startsWith(absPath)).to.equal(true);
  });

  it('Resolve "./testServer/" relative path', function () {
    return expect(sftp.realPath('./testServer')).to.eventually.equal(
      config.sftpUrl
    );
  });

  it('Resolve "../testServer" relative path', async function () {
    let p = await sftp.realPath('.');
    let pComponents = p.split('/');
    let rslt =
      pComponents.slice(0, pComponents.length - 1).join('/') + '/testServer';
    return expect(sftp.realPath('../testServer')).to.eventually.equal(rslt);
  });

  it('cwd() returns current working dir', async function () {
    let pwd = await sftp.cwd();
    return expect(config.sftpUrl.startsWith(pwd)).to.equal(true);
  });

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
    ).to.eventually.equal(config.sftpUrl + '/path-test-dir/path-file2.txt.gz');
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
