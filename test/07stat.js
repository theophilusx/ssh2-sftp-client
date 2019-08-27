'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const gHooks = require('./hooks/global-hooks');
const sHooks = require('./hooks/stat-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

let hookSftp, sftp, sftpUrl;

before('Global setup', function() {
  return gHooks
    .setup()
    .then(testEnv => {
      hookSftp = testEnv.hookSftp;
      sftp = testEnv.sftp;
      sftpUrl = testEnv.sftpUrl;
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

after('Global shutdown', function() {
  return gHooks
    .closeDown()
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

describe('Stat method tests', function() {
  before(() => {
    return sHooks.statSetup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after(() => {
    return sHooks.statCleanup(hookSftp, sftpUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Stat return should be a promise', function() {
    return expect(sftp.stat(join(sftpUrl, 'mocha-stat.md'))).to.be.a('promise');
  });

  it('Stat on existing file returns stat data', async function() {
    let stats = await sftp.stat(join(sftpUrl, 'mocha-stat.md'));

    return expect(stats).to.containSubset({
      mode: 33279,
      size: 5,
      uid: 1000,
      gid: 985,
      isDirectory: false,
      isFile: true,
      isBlockDevice: false,
      isCharacterDevice: false,
      isSymbolicLink: false,
      isFIFO: false,
      isSocket: false
    });
  });

  it('Stat on non-existent file rejected', function() {
    return expect(
      sftp.stat(join(sftpUrl, 'mocha-stat1.md'))
    ).to.be.rejectedWith('No such file');
  });
});
