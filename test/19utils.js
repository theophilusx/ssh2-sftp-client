'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection,
  makeRemotePath,
  makeLocalPath
} = require('./hooks/global-hooks');
const utils = require('../src/utils');
const {targetType} = require('../src/constants');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('formatError tests', function() {
  it('formatError returns Error object', function() {
    return expect(utils.formatError('test msg', 'test', 'error code')).to.be.an(
      'error'
    );
  });

  it('formatError has expected values', function() {
    return expect(
      utils.formatError('test msg', 'name', 'error code')
    ).to.containSubset({
      message: 'name: test msg',
      code: 'error code'
    });
  });

  it('formatError has retry count', function() {
    return expect(
      utils.formatError('test msg', 'name', 'error code', 4)
    ).to.containSubset({
      message: 'name: test msg after 4 attempts',
      code: 'error code'
    });
  });

  it('formatError has default error code', function() {
    return expect(utils.formatError('test msg', 'nme').code).to.equal(
      'ERR_GENERIC_CLIENT'
    );
  });

  it('formatError has default name', function() {
    return expect(utils.formatError('test msg').message).to.equal(
      'sftp: test msg'
    );
  });
});

describe('Test checkRemotePath', function() {
  let sftp, sftpHook;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Exist test setup hook', async function() {
    sftp = await getConnection('utils');
    sftpHook = await getConnection('utils-hook');
    let remoteDir = makeRemotePath(config.sftpUrl, 'check-dir');
    await sftpHook.mkdir(remoteDir, true);
    let remoteFile = makeRemotePath(config.sftpUrl, 'check-file.txt');
    let localFile = makeLocalPath(config.localUrl, 'test-file1.txt');
    await sftpHook.fastPut(localFile, remoteFile);
    return true;
  });

  after('Exist test cleanup hook', async function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'check-dir');
    let remoteFile = makeRemotePath(config.sftpUrl, 'check-file.txt');
    await sftpHook.rmdir(remoteDir, true);
    await sftpHook.delete(remoteFile);
    await closeConnection('utils', sftp);
    await closeConnection('utils-hook', sftpHook);
    return true;
  });

  it('Returns valid for remote dir', function() {
    return expect(
      utils.checkRemotePath(sftp, config.sftpUrl, targetType.readDir)
    ).to.become({path: config.sftpUrl, type: 'd', valid: true});
  });

  it('Returns valid for remote file', function() {
    let remoteFile = makeRemotePath(config.sftpUrl, 'check-file.txt');
    return expect(
      utils.checkRemotePath(sftp, remoteFile, targetType.readFile)
    ).to.become({
      path: remoteFile,
      type: '-',
      valid: true
    });
  });

  it('Invalid if wrong target type (dir)', function() {
    let remotePath = makeRemotePath(config.sftpUrl, 'check-file.txt');
    return expect(
      utils.checkRemotePath(sftp, remotePath, targetType.readDir)
    ).to.become({
      path: remotePath,
      type: '-',
      valid: false,
      msg: `Bad path: ${remotePath} must be a directory`,
      code: 'ERR_BAD_PATH'
    });
  });

  it('invalid if wrong target type (file)', function() {
    return expect(
      utils.checkRemotePath(sftp, config.sftpUrl, targetType.readFile)
    ).to.become({
      path: config.sftpUrl,
      type: 'd',
      valid: false,
      msg: `Bad path: ${config.sftpUrl} must be a file`,
      code: 'ERR_BAD_PATH'
    });
  });

  it('valid but undefined type for non-existent file', function() {
    let remotePath = makeRemotePath(config.sftpUrl, 'no-such-file.gz');
    return expect(
      utils.checkRemotePath(sftp, remotePath, targetType.writeFile)
    ).to.become({
      path: remotePath,
      type: false,
      valid: true
    });
  });

  it('valid but undefined type for non-existent dir', function() {
    let remotePath = makeRemotePath(config.sftpUrl, 'no-such-dir');
    return expect(
      utils.checkRemotePath(sftp, remotePath, targetType.writeDir)
    ).to.become({
      path: remotePath,
      type: false,
      valid: true
    });
  });
});

describe('Test checkLocalPath', function() {
  it('Returns valid for local dir', function() {
    return expect(
      utils.checkLocalPath(config.localUrl, targetType.readDir)
    ).to.become({path: config.localUrl, type: 'd', valid: true});
  });

  it('Return valid for local file', function() {
    let localPath = makeLocalPath(config.localUrl, 'test-file1.txt');
    return expect(
      utils.checkLocalPath(localPath, targetType.readFile)
    ).to.become({
      path: localPath,
      type: '-',
      valid: true
    });
  });

  it('invalid if wrong target type (file)', function() {
    return expect(
      utils.checkLocalPath(config.localUrl, targetType.readFile)
    ).to.become({
      path: config.localUrl,
      type: 'd',
      valid: false,
      msg: `Bad path: ${config.localUrl} must be a file`,
      code: 'ERR_BAD_PATH'
    });
  });

  it('Invalid if wrong target type (dir)', function() {
    let localPath = makeLocalPath(config.localUrl, 'test-file1.txt');
    return expect(
      utils.checkLocalPath(localPath, targetType.readDir)
    ).to.become({
      path: localPath,
      type: '-',
      valid: false,
      msg: `Bad path: ${localPath} must be a directory`,
      code: 'ERR_BAD_PATH'
    });
  });

  it('valid but undefined type for non-existing file', function() {
    let localPath = makeLocalPath(config.localUrl, 'no-such-file.gz');
    return expect(
      utils.checkLocalPath(localPath, targetType.writeFile)
    ).to.become({
      path: localPath,
      type: false,
      valid: true
    });
  });

  it('valid but undefined type for non-existing dir', function() {
    let localPath = makeLocalPath(config.localUrl, 'no-such-dir');
    return expect(
      utils.checkLocalPath(localPath, targetType.writeDir)
    ).to.become({
      path: localPath,
      type: false,
      valid: true
    });
  });
});
