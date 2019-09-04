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
const mHooks = require('./hooks/mkdir-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Mkdir method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Mkdir setup hook', async function() {
    hookSftp = await getConnection('mkdir-hook');
    sftp = await getConnection('mkdir');
    return true;
  });

  after('Mkdir test cleanup', async function() {
    await mHooks.mkdirCleanup(hookSftp, config.sftpUrl);
    await closeConnection('mkdir', sftp);
    await closeConnection('mkdir-hook', hookSftp);
    return true;
  });

  it('Mkdir should return a promise', function() {
    return expect(sftp.mkdir(join(config.sftpUrl, 'mocha'))).to.be.a('promise');
  });

  it('Mkdir without recursive option and bad path should be rejected', function() {
    return expect(
      sftp.mkdir(join(config.sftpUrl, 'mocha3', 'mm'))
    ).to.be.rejectedWith('Failed to create directory');
  });

  it('Mkdir with recursive option should create all directories', function() {
    return sftp
      .mkdir(join(config.sftpUrl, 'mocha', 'mocha-dir-force', 'subdir'), true)
      .then(() => {
        return sftp.list(join(config.sftpUrl, 'mocha', 'mocha-dir-force'));
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'subdir'}]);
      });
  });

  it('mkdir without recursive option creates dir', function() {
    return sftp
      .mkdir(join(config.sftpUrl, 'mocha', 'mocha-non-recursive'), false)
      .then(() => {
        return sftp.list(join(config.sftpUrl, 'mocha'));
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'mocha-non-recursive'}]);
      });
  });

  it('Relative directory name creates dir', function() {
    let path = 'xyz';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${path} directory created`
    );
  });

  it('Relative directory with sub dir creation', function() {
    let path = 'xyz/abc';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${path} directory created`
    );
  });

  it('Relative dir name created with recursive flag', function() {
    let path = 'abc';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `./${path} directory created`
    );
  });

  it('relative dir and sub dir created with recursive flag', function() {
    let path = 'def/ghi';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${path} directory created`
    );
  });
});

describe('test mkdir without permissions', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Mkdir setup hook', async function() {
    hookSftp = await getConnection('mkdir-hook');
    sftp = await getConnection('mkdir');
    return true;
  });

  after('Mkdir test cleanup', async function() {
    await closeConnection('mkdir', sftp);
    await closeConnection('mkdir-hook', hookSftp);
    return true;
  });

  it('Create directory without write permission throws exception', function() {
    return expect(
      sftp.mkdir(join(config.sftpUrl, 'perm-test', 'dir-t2', 'dir-t6'), true)
    ).to.be.rejectedWith('Failed to create directory');
  });
});
