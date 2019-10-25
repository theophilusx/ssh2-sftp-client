'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection,
  makeRemotePath
} = require('./hooks/global-hooks');
const {pathSetup, pathCleanup} = require('./hooks/path-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Path tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Exist test setup hook', async function() {
    hookSftp = await getConnection('path-hook');
    sftp = await getConnection('path');
    await pathSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('Exist test cleanup hook', async function() {
    //await pathCleanup(hookSftp, config.sftpUrl);
    await closeConnection('path', sftp);
    await closeConnection('path-hook', hookSftp);
    return true;
  });

  it(`Resolves absolute path ${config.sftpUrl}`, function() {
    return expect(
      sftp.realPath(makeRemotePath(config.sftpUrl))
    ).to.eventually.equal(config.sftpUrl);
  });

  it('Resolve "." relative path', async function() {
    let absPath = await sftp.realPath('.');
    return expect(config.sftpUrl.startsWith(absPath)).to.equal(true);
  });

  it('Resolve ".." relative path', async function() {
    let absPath = await sftp.realPath('..');
    return expect(config.sftpUrl.startsWith(absPath)).to.equal(true);
  });

  it('Resolve "./testServer" relative path', function() {
    return expect(sftp.realPath('./testServer')).to.eventually.equal(
      config.sftpUrl
    );
  });

  it('Resolve "../user/testServer" relative path', function() {
    return expect(
      sftp.realPath(makeRemotePath('..', config.username, 'testServer'))
    ).to.eventually.equal(config.sftpUrl);
  });

  it('cwd() returns current working dir', async function() {
    let pwd = await sftp.cwd();
    return expect(config.sftpUrl.startsWith(pwd)).to.equal(true);
  });

  it('returns path to test directory', async function() {
    let p = await sftp.realPath(
      makeRemotePath(config.sftpUrl, 'path-test-dir')
    );
    return expect(p).to.equal(makeRemotePath(config.sftpUrl, 'path-test-dir'));
  });

  it('return path to test file 1', async function() {
    let p = await sftp.realPath(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file1.txt')
    );
    return expect(p).to.equal(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file1.txt')
    );
  });

  it('return path to test file 2', async function() {
    let p = await sftp.realPath(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file2.txt.gz')
    );
    return expect(p).to.equal(
      makeRemotePath(config.sftpUrl, 'path-test-dir', 'path-file2.txt.gz')
    );
  });

  it('realPath throws exception for non-existing path', function() {
    return expect(
      sftp.realPath(
        makeRemotePath(
          config.sftpUrl,
          'path-test-dir',
          'path-not-exist-dir',
          'path-not-exist-file.txt'
        )
      )
    ).to.be.rejectedWith('No such file');
  });
});
