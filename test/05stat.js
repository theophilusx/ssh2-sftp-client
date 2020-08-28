'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const {statSetup, statCleanup} = require('./hooks/stat-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('stat() method tests', function () {
  let sftp;

  before('stat setup hook', async function () {
    sftp = await getConnection();
    await statSetup(sftp, config.sftpUrl);
    return true;
  });

  after('stat cleanup hook', async function () {
    await statCleanup(sftp, config.sftpUrl);
    return true;
  });

  it('stat return should be a promise', function () {
    return expect(sftp.stat(config.sftpUrl + '/stat-test.md')).to.be.a(
      'promise'
    );
  });

  it('stat on existing file returns stat data', async function () {
    let stats = await sftp.stat(config.sftpUrl + '/stat-test.md');

    return expect(stats).to.containSubset({
      size: 16,
      isFile: true
    });
  });

  it('stat on non-existent file rejected', function () {
    return expect(
      sftp.stat(config.sftpUrl + '/stat-test-not-exist.md')
    ).to.be.rejectedWith('No such file');
  });

  it('stat on "." returns isDirectory = true', async function () {
    let data = await sftp.stat('.');
    return expect(data.isDirectory).to.equal(true);
  });

  it('stat on ".." returns isDirectory = true', async function () {
    let data = await sftp.stat('..');
    return expect(data.isDirectory).to.equal(true);
  });
});
