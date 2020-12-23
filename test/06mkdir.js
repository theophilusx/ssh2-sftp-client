'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {mkdirCleanup} = require('./hooks/mkdir-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('mkdir() method tests', function () {
  let sftp;

  before('mkdir() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('mkdir() test cleanup', async function () {
    await mkdirCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('mkdir should return a promise', function () {
    return expect(sftp.mkdir(`${config.sftpUrl}/mkdir-promise`)).to.be.a(
      'promise'
    );
  });

  it('mkdir without recursive option and bad path should be rejected', function () {
    return expect(sftp.mkdir(`${config.sftpUrl}/mocha3/mm`)).to.be.rejectedWith(
      /No such file/
    );
  });

  it('mkdir with recursive option should create all directories', function () {
    return sftp
      .mkdir(`${config.sftpUrl}/mkdir-recursive/dir-force/subdir`, true)
      .then(() => {
        return sftp.list(`${config.sftpUrl}/mkdir-recursive/dir-force`);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'subdir'}]);
      });
  });

  it('mkdir without recursive option creates dir', function () {
    return sftp
      .mkdir(config.sftpUrl + '/mkdir-non-recursive', false)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{name: 'mkdir-non-recursive'}]);
      });
  });

  it('Relative directory name creates dir', function () {
    let path = './testServer/mkdir-xyz';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-xyz directory created`
    );
  });

  it('Relative directory with sub dir creation', function () {
    let path = './testServer/mkdir-xyz/abc';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-xyz/abc directory created`
    );
  });

  it('Relative dir name created with recursive flag', function () {
    let path = './testServer/mkdir-abc';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-abc directory created`
    );
  });

  it('relative dir and sub dir created with recursive flag', function () {
    let path = './testServer/mkdir-def/ghi';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-def/ghi directory created`
    );
  });

  // permissions don't really work on win32
  it('non-recursive mkdir without permission is rejeted', function () {
    if (sftp.remotePlatform !== 'win32') {
      return expect(sftp.mkdir('/foo', false)).to.be.rejectedWith(
        /Permission denied/
      );
    } else {
      return expect(true).to.equal(true);
    }
  });

  it('recursive mkdir without permission is rejeted', function () {
    if (sftp.remotePlatform !== 'win32') {
      return expect(sftp.mkdir('/foo', true)).to.be.rejectedWith(
        /Permission denied/
      );
    } else {
      return expect(true).to.equal(true);
    }
  });
});
