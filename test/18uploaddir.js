'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection,
  makeLocalPath,
  makeRemotePath
} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('uploadDir tests', function() {
  let sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('UploadDir setup hook', async function() {
    sftp = await getConnection('upload');
    return true;
  });

  after('UploadDir clenaup hook', async function() {
    await closeConnection('upload', sftp);
    return true;
  });

  it('Upload directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Upload top-level files', function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
  });
});
