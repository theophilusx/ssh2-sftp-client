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
const {appendSetup, appendCleanup} = require('./hooks/append-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('append() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('append test setup hook', async function() {
    hookSftp = await getConnection('append-hook');
    sftp = await getConnection('append');
    await appendSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('append test cleanup hook', async function() {
    await appendCleanup(hookSftp, config.sftpUrl);
    await closeConnection('append', sftp);
    await closeConnection('append-hook', hookSftp);
    return true;
  });

  it('append should return a promise', function() {
    return expect(
      sftp.append(
        Buffer.from('append test 1'),
        join(config.sftpUrl, 'append-promise-test.md'),
        {
          encoding: 'utf8'
        }
      )
    ).to.be.a('promise');
  });

  it('append two files is rejected', function() {
    return expect(
      sftp.append(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'append-test1.md')
      )
    ).to.be.rejectedWith('Cannot append one file to another');
  });

  it('append buffer to file', function() {
    return sftp
      .append(Buffer.from('hello'), join(config.sftpUrl, 'append-test2.txt'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'append-test2.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 23});
      });
  });

  it('append stream to file', function() {
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .append(str2, join(config.sftpUrl, 'append-test3'), {encoding: 'utf8'})
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'append-test3'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 32});
      });
  });

  it('append with bad dst path is rejected', function() {
    return expect(
      sftp.append(
        Buffer.from('hello'),
        join(config.sftpUrl, 'bad-directory', 'bad-file.txt')
      )
    ).to.be.rejectedWith('No such file');
  });

  it('append to non-existing file is rejected', function() {
    return expect(
      sftp.append(
        Buffer.from('should not work'),
        join(config.sftpUrl, 'append-no-such-file.txt')
      )
    ).to.be.rejectedWith('No such file');
  });

  it('append to directory is rejected', function() {
    return expect(
      sftp.append(
        Buffer.from('should not work'),
        join(config.sftpUrl, 'append-dir-test')
      )
    ).to.be.rejectedWith('Remote path must be a regular file');
  });

  it('append relative remote path 1', function() {
    return sftp
      .append(Buffer.from('hello'), './testServer/append-test2.txt', {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'append-test2.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 28});
      });
  });

  it('append relative remote path 2', function() {
    return sftp
      .append(
        Buffer.from('hello'),
        `../${config.username}/testServer/append-test2.txt`,
        {
          encoding: 'utf8'
        }
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'append-test2.txt'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 33});
      });
  });
});
