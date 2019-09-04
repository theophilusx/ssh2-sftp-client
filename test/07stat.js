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
const sHooks = require('./hooks/stat-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Stat method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('stat setup hook', async function() {
    hookSftp = await getConnection('stat');
    sftp = await getConnection('stat-hook');
    await sHooks.statSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('stat cleanup hook', async function() {
    await sHooks.statCleanup(hookSftp, config.sftpUrl);
    await closeConnection('stat', sftp);
    await closeConnection('stat-hook', hookSftp);
    return true;
  });

  it('Stat return should be a promise', function() {
    return expect(sftp.stat(join(config.sftpUrl, 'mocha-stat.md'))).to.be.a(
      'promise'
    );
  });

  it('Stat on existing file returns stat data', async function() {
    let stats = await sftp.stat(join(config.sftpUrl, 'mocha-stat.md'));

    return expect(stats).to.containSubset({
      mode: 33279,
      size: 5,
      isFile: true
    });
  });

  it('Stat on non-existent file rejected', function() {
    return expect(
      sftp.stat(join(config.sftpUrl, 'mocha-stat1.md'))
    ).to.be.rejectedWith('No such file');
  });
});
