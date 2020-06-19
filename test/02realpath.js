'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  makeRemotePath,
  lastRemoteDir
} = require('./hooks/global-hooks');
const {pathSetup, pathCleanup} = require('./hooks/path-hooks');

chai.use(chaiAsPromised);

describe('Path tests', function () {
  let sftp;

  // before(function (done) {
  //   setTimeout(function () {
  //     done();
  //   }, config.delay);
  // });

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
    return expect(
      sftp.realPath(makeRemotePath(config.sftpUrl))
    ).to.eventually.equal(config.sftpUrl);
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

  it('Resolve "../testServer" relative path', function () {
    return expect(
      sftp.realPath(
        makeRemotePath('..', lastRemoteDir(config.remoteRoot), 'testServer')
      )
    ).to.eventually.equal(config.sftpUrl);
  });

  it('cwd() returns current working dir', async function () {
    let pwd = await sftp.cwd();
    return expect(config.sftpUrl.startsWith(pwd)).to.equal(true);
  });

  it('returns path to test directory', async function () {
    let p = await sftp.realPath(
      makeRemotePath(config.sftpUrl, 'path-test-dir')
    );
    return expect(p).to.equal(makeRemotePath(config.sftpUrl, 'path-test-dir'));
  });

  it('return path to test file 1', async function () {
    let p = await sftp.realPath(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file1.txt')
    );
    return expect(p).to.equal(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file1.txt')
    );
  });

  it('return path to test file 2', async function () {
    let p = await sftp.realPath(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file2.txt.gz')
    );
    return expect(p).to.equal(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file2.txt.gz')
    );
  });

  it("realPath returns '' for non-existing path", function () {
    return expect(
      sftp.realPath(
        makeRemotePath(
          config.sftpUrl,
          'path-test-dir',
          'path-not-exist-dir',
          'path-not-exist-file.txt'
        )
      )
    ).to.eventually.equal('');
  });
});
