'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const fs = require('fs');
const zlib = require('zlib');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const gHooks = require('./hooks/get-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Get method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Get setup hook', async function() {
    hookSftp = await getConnection('get-hook');
    sftp = await getConnection('get');
    await gHooks.getSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('Get cleanup hook', async function() {
    await gHooks.getCleanup(hookSftp, config.sftpUrl, config.localUrl);
    await closeConnection('get', sftp);
    await closeConnection('get-hook', hookSftp);
    return true;
  });

  it('Get returns a promise', function() {
    return expect(sftp.get(join(config.sftpUrl, 'mocha-file.md'))).to.be.a(
      'promise'
    );
  });

  it('get the file content', function() {
    return sftp.get(join(config.sftpUrl, 'mocha-file.md')).then(data => {
      let body = data.toString();
      return expect(body).to.equal('hello');
    });
  });

  it('Get large text file using a stream', function() {
    let localFile = join(config.localUrl, 'local-large-file.txt');
    return sftp
      .get(join(config.sftpUrl, 'large-file1.txt'), localFile, {
        encoding: 'utf8'
      })
      .then(() => {
        let stats = fs.statSync(localFile);
        return expect(stats.size).to.equal(6973257);
      });
  });

  it('Get gzipped file using a stream', function() {
    let localFile = join(config.localUrl, 'local-gizipped-file.txt.gz');
    return sftp
      .get(join(config.sftpUrl, 'gzipped-file.txt.gz'), localFile)
      .then(() => {
        let stats = fs.statSync(localFile);
        return expect(stats.size).to.equal(570314);
      });
  });

  it('Get gzipped file and gunzip in pipe', function() {
    let localFile = join(config.localUrl, 'local-gzipped-file.txt');
    let gunzip = zlib.createGunzip();
    let out = fs.createWriteStream(localFile, {
      flags: 'w',
      encoding: null
    });
    gunzip.pipe(out);
    return sftp
      .get(join(config.sftpUrl, 'gzipped-file.txt.gz'), gunzip)
      .then(() => {
        let stats = fs.statSync(localFile);
        return expect(stats.size).to.equal(6973257);
      });
  });

  it('Get non-existent file is rejected', function() {
    return expect(
      sftp.get(join(config.sftpUrl, 'moacha-file-not-exist.md'))
    ).to.be.rejectedWith('No such file');
  });
});
