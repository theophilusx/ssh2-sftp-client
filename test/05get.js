'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const fs = require('fs');
const zlib = require('zlib');
const {setup, closeDown} = require('./hooks/global-hooks');
const gHooks = require('./hooks/get-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

let hookSftp, sftp, sftpUrl, localUrl;

before('Global setup', function() {
  return setup()
    .then(testEnv => {
      hookSftp = testEnv.hookSftp;
      sftp = testEnv.sftp;
      (sftpUrl = testEnv.sftpUrl), (localUrl = testEnv.localUrl);
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

after('Global shutdown', function() {
  return closeDown()
    .then(() => {
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
});

describe('Get method tests', function() {
  before('Get setup hook', function() {
    return gHooks.getSetup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  after('Get cleanup hook', function() {
    return gHooks.getCleanup(hookSftp, sftpUrl, localUrl).catch(err => {
      throw new Error(err.message);
    });
  });

  it('Get returns a promise', function() {
    return expect(sftp.get(join(sftpUrl, 'mocha-file.md'))).to.be.a('promise');
  });

  it('get the file content', function() {
    return sftp.get(join(sftpUrl, 'mocha-file.md')).then(data => {
      let body = data.toString();
      return expect(body).to.equal('hello');
    });
  });

  it('Get large text file using a stream', function() {
    let localFile = join(localUrl, 'local-large-file.txt');
    return sftp
      .get(join(sftpUrl, 'large-file1.txt'), localFile, {encoding: 'utf8'})
      .then(() => {
        let stats = fs.statSync(localFile);
        return expect(stats.size).to.equal(6973257);
      });
  });

  it('Get gzipped file using a stream', function() {
    let localFile = join(localUrl, 'local-gizipped-file.txt.gz');
    return sftp
      .get(join(sftpUrl, 'gzipped-file.txt.gz'), localFile)
      .then(() => {
        let stats = fs.statSync(localFile);
        return expect(stats.size).to.equal(570314);
      });
  });

  it('Get gzipped file and gunzip in pipe', function() {
    let localFile = join(localUrl, 'local-gzipped-file.txt');
    let gunzip = zlib.createGunzip();
    let out = fs.createWriteStream(localFile, {
      flags: 'w',
      encoding: null
    });
    gunzip.pipe(out);
    return sftp.get(join(sftpUrl, 'gzipped-file.txt.gz'), gunzip).then(() => {
      let stats = fs.statSync(localFile);
      return expect(stats.size).to.equal(6973257);
    });
  });

  it('Get non-existent file is rejected', function() {
    return expect(
      sftp.get(join(sftpUrl, 'moacha-file-not-exist.md'))
    ).to.be.rejectedWith('No such file');
  });
});
