'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Path tests', function() {
  let sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Exist test setup hook', async function() {
    sftp = await getConnection('exist');
    return true;
  });

  after('Exist test cleanup hook', async function() {
    await closeConnection('exist', sftp);
    return true;
  });

  it(`Resolves absolute path ${config.sftpUrl}`, function() {
    return expect(sftp.realPath(config.sftpUrl)).to.eventually.equal(
      config.sftpUrl
    );
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
      sftp.realPath(`../${config.username}/testServer`)
    ).to.eventually.equal(config.sftpUrl);
  });

  it('cwd() returns current working dir', async function() {
    let pwd = await sftp.cwd();
    return expect(config.sftpUrl.startsWith(pwd)).to.equal(true);
  });
});
