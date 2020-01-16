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
const utils = require('../src/utils');
const {errorCode, targetType} = require('../src/constants');

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
  let sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Exist test setup hook', async function() {
    sftp = await getConnection('utils');
    return true;
  });

  after('Exist test cleanup hook', async function() {
    await closeConnection('utils', sftp);
    return true;
  });

  it('Returns valid for remote dir', function() {
    return expect(
      utils.checkRemotePath(sftp, config.sftpUrl, targetType.readDir)
    ).to.become({path: config.sftpUrl, type: 'd', valid: true});
  });

  it('invalid if wrong target type', function() {
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
});
