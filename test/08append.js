'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const stream = require('stream');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const aHooks = require('./hooks/append-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Append method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Append test setup hook', async function() {
    hookSftp = await getConnection('append-hook');
    sftp = await getConnection('append');
    aHooks.appendSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('Append test cleanup hook', async function() {
    await aHooks.appendCleanup(hookSftp, config.sftpUrl);
    await closeConnection('append', sftp);
    await closeConnection('append-hook', hookSftp);
    return true;
  });

  it('Append should return a promise', function() {
    let testFile = 'mocha-append-test1.md';

    return expect(
      sftp.append(
        Buffer.from('append test 1'),
        join(config.sftpUrl, testFile),
        {
          encoding: 'utf8'
        }
      )
    ).to.be.a('promise');
  });

  it('Append two files is rejected', function() {
    let testFile = 'mocha-append-test1.md';

    return expect(
      sftp.append(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, testFile)
      )
    ).to.be.rejectedWith('Cannot append one file to another');
  });

  it('Append buffer to file', function() {
    let testFile = 'mocha-append-test2.md';

    return sftp
      .append(Buffer.from('hello'), join(config.sftpUrl, testFile), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, testFile));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('Append stream to file', function() {
    let testFile = 'mocha-append-test3.md';
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .append(str2, join(config.sftpUrl, testFile), {encoding: 'utf8'})
      .then(() => {
        return sftp.stat(join(config.sftpUrl, testFile));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 30});
      });
  });

  it('Append with bad dst path is rejected', function() {
    return expect(
      sftp.append(
        Buffer.from('hello'),
        join(config.sftpUrl, 'bad-directory', 'bad-file.txt')
      )
    ).to.be.rejectedWith('No such file');
  });
});
