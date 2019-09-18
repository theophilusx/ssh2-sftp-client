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

  it('Resolve "." relative path', function() {
    return expect(sftp.realPath('.')).to.eventually.equal(
      join('/home', config.username)
    );
  });

  it('Resolve ".." relative path', function() {
    return expect(sftp.realPath('..')).to.eventually.equal('/home');
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

  it('cwd() returns current working dir', function() {
    return expect(sftp.cwd()).to.eventually.equal(
      join('/home', config.username)
    );
  });
});
