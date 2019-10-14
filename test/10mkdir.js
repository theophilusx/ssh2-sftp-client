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
const {mkdirCleanup} = require('./hooks/mkdir-hooks');
const {makeRemotePath} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('mkdir() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('mkdir setup hook', async function() {
    hookSftp = await getConnection('mkdir-hook');
    sftp = await getConnection('mkdir');
    return true;
  });

  after('mkdir test cleanup', async function() {
    await mkdirCleanup(hookSftp, config.sftpUrl);
    await closeConnection('mkdir', sftp);
    await closeConnection('mkdir-hook', hookSftp);
    return true;
  });

  it('mkdir should return a promise', function() {
    return expect(
      sftp.mkdir(makeRemotePath(config.sftpUrl, 'mkdir-promise'))
    ).to.be.a('promise');
  });

  it('mkdir without recursive option and bad path should be rejected', function() {
    return expect(
      sftp.mkdir(makeRemotePath(config.sftpUrl, 'mocha3', 'mm'))
    ).to.be.rejectedWith('Failed to create directory');
  });

  it('mkdir with recursive option should create all directories', function() {
    return sftp
      .mkdir(
        makeRemotePath(
          config.sftpUrl,
          'mkdir-recursive',
          'dir-force',
          'subdir'
        ),
        true
      )
      .then(() => {
        return sftp.list(
          makeRemotePath(config.sftpUrl, 'mkdir-recursive', 'dir-force')
        );
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'subdir'}]);
      });
  });

  it('mkdir without recursive option creates dir', function() {
    return sftp
      .mkdir(makeRemotePath(config.sftpUrl, 'mkdir-non-recursive'), false)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([{name: 'mkdir-non-recursive'}]);
      });
  });

  it('Relative directory name creates dir', function() {
    let path = './testServer/mkdir-xyz';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-xyz directory created`
    );
  });

  it('Relative directory with sub dir creation', function() {
    let path = './testServer/mkdir-xyz/abc';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-xyz/abc directory created`
    );
  });

  it('Relative dir name created with recursive flag', function() {
    let path = './testServer/mkdir-abc';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-abc directory created`
    );
  });

  it('relative dir and sub dir created with recursive flag', function() {
    let path = './testServer/mkdir-def/ghi';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-def/ghi directory created`
    );
  });
});
