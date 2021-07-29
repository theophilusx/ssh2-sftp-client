'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const stream = require('stream');
const {config, getConnection} = require('./hooks/global-hooks');
const {appendSetup, appendCleanup} = require('./hooks/append-hooks');
const {makeLocalPath, lastRemoteDir} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('append() method tests', function () {
  let sftp;

  before('append() test setup hook', async function () {
    sftp = await getConnection();
    await appendSetup(sftp, config.sftpUrl);
    return true;
  });

  after('append() test cleanup hook', async function () {
    await appendCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('append should return a promise', function () {
    return expect(
      sftp.append(
        Buffer.from('append test 1'),
        `${config.sftpUrl}/append-promise-test.md`,
        {
          encoding: 'utf8'
        }
      )
    ).to.be.a('promise');
  });

  it('append two files is rejected', function () {
    return expect(
      sftp.append(
        makeLocalPath(config.localUrl, 'test-file1.txt'),
        `${config.sftpUrl}/append-test1.md`
      )
    ).to.be.rejectedWith('Cannot append one file to another');
  });

  it('append buffer to file', function () {
    return sftp
      .append(Buffer.from('hello'), `${config.sftpUrl}/append-test2.txt`, {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(`${config.sftpUrl}/append-test2.txt`);
      })
      .then((stats) => {
        return expect(stats).to.containSubset({size: 23});
      });
  });

  it('append stream to file', function () {
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .append(str2, `${config.sftpUrl}/append-test3`, {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(`${config.sftpUrl}/append-test3`);
      })
      .then((stats) => {
        return expect(stats).to.containSubset({size: 32});
      });
  });

  it('append with bad dst path is rejected', function () {
    return expect(
      sftp.append(
        Buffer.from('hello'),
        `${config.sftpUrl}/bad-directory/bad-file.txt`
      )
    ).to.be.rejectedWith('No such file');
  });

  it('append to non-existing file creates the file', function () {
    return expect(
      sftp.append(
        Buffer.from('this should create a file'),
        config.sftpUrl + '/append-new-file.txt'
      )
    ).to.eventually.equal(
      `Appended data to ${config.sftpUrl}/append-new-file.txt`
    );
  });

  it('append to directory is rejected', function () {
    return expect(
      sftp.append(
        Buffer.from('should not work'),
        `${config.sftpUrl}/append-dir-test`
      )
    ).to.be.rejectedWith('Failure');
  });

  it('append relative remote path 1', function () {
    return sftp
      .append(Buffer.from('hello'), './testServer/append-test2.txt', {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(`${config.sftpUrl}/append-test2.txt`);
      })
      .then((stats) => {
        return expect(stats).to.containSubset({size: 28});
      });
  });

  it('append relative remote path 2', function () {
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/append-test2.txt`;
    return sftp
      .append(Buffer.from('hello'), remotePath, {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(`${config.sftpUrl}/append-test2.txt`);
      })
      .then((stats) => {
        return expect(stats).to.containSubset({size: 33});
      });
  });
});
