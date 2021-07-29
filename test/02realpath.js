'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');

chai.use(chaiAsPromised);

describe('Path tests', async function () {
  let sftp;

  before('realpath() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('realPath() cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it(`Resolves absolute path ${config.sftpUrl}`, function () {
    return expect(sftp.realPath(config.sftpUrl)).to.eventually.equal(
      config.sftpUrl
    );
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

  it('Resolve "../testServer" relative path', async function () {
    let p = await sftp.realPath('.');
    let pComponents = p.split('/');
    let rslt =
      pComponents.slice(0, pComponents.length - 1).join('/') + '/testServer';
    return expect(sftp.realPath('../testServer')).to.eventually.equal(rslt);
  });

  it('cwd() returns current working dir', async function () {
    let pwd = await sftp.cwd();
    return expect(config.sftpUrl.startsWith(pwd)).to.equal(true);
  });
});
