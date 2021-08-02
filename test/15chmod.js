'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const { config, getConnection } = require('./hooks/global-hooks');
const { chmodSetup, chmodCleanup } = require('./hooks/chmod-hooks');
const { lastRemoteDir } = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('chmod() method tests', function () {
  let sftp;

  before('chmod() setup hook', async function () {
    sftp = await getConnection();
    await chmodSetup(sftp, config.sftpUrl);
    return true;
  });

  after('chmod() cleanup hook', async function () {
    await chmodCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('chmod should return a promise', function () {
    return expect(
      sftp.chmod(`${config.sftpUrl}/chmod-test.txt`, 0o444)
    ).to.be.a('promise');
  });

  it('chmod on a file reports correct mode', function () {
    let results =
      config.testServer === 'windows'
        ? [
            {
              name: 'chmod-test.txt',
              rights: {
                user: 'rwx',
                group: '***',
                other: '***',
              },
            },
          ]
        : [
            {
              name: 'chmod-test.txt',
              rights: {
                user: 'rwx',
                group: 'rwx',
                other: 'rwx',
              },
            },
          ];
    return sftp
      .chmod(`${config.sftpUrl}/chmod-test.txt`, 0o777)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(
          list.filter((e) => (e.name = 'chmod-test.txt'))
        ).to.containSubset(results);
      });
  });

  it('chmod on a directory reports correct mode', function () {
    let results =
      config.testServer === 'windows'
        ? [
            {
              name: 'chmod-test-dir',
              rights: {
                user: 'rx',
                group: '***',
                other: '***',
              },
            },
          ]
        : [
            {
              name: 'chmod-test-dir',
              rights: {
                user: 'r',
                group: 'r',
                other: 'r',
              },
            },
          ];
    return sftp
      .chmod(`${config.sftpUrl}/chmod-test-dir`, 0o444)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset(results);
      });
  });

  it('chmod on non-existent file is rejecterd', function () {
    return expect(
      sftp.chmod(`${config.sftpUrl}/does-not-exist.txt`, 0o777)
    ).to.be.rejectedWith('No such file');
  });

  it('chmod on a relative file path 1', function () {
    let results =
      config.testServer === 'windows'
        ? [
            {
              name: 'chmod-test.txt',
              rights: {
                user: 'r',
                group: '***',
                other: '***',
              },
            },
          ]
        : [
            {
              name: 'chmod-test.txt',
              rights: {
                user: 'x',
                group: 'x',
                other: 'x',
              },
            },
          ];
    return sftp
      .chmod('./testServer/chmod-test.txt', 0o111)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset(results);
      });
  });

  it('chmod on relative file path 2', function () {
    let results =
      config.testServer === 'windows'
        ? [
            {
              name: 'chmod-test.txt',
              rights: {
                user: 'rw',
                group: '***',
                other: '***',
              },
            },
          ]
        : [
            {
              name: 'chmod-test.txt',
              rights: {
                user: 'rw',
                group: '',
                other: '',
              },
            },
          ];
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/chmod-test.txt`;
    return sftp
      .chmod(remotePath, 0o600)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset(results);
      });
  });

  it('chmod on relative path dir 3', function () {
    let results =
      config.testServer === 'windows'
        ? [
            {
              name: 'chmod-test-dir',
              rights: {
                user: 'rwx',
                group: '***',
                other: '***',
              },
            },
          ]
        : [
            {
              name: 'chmod-test-dir',
              rights: {
                user: 'w',
                group: 'w',
                other: 'w',
              },
            },
          ];
    return sftp
      .chmod('./testServer/chmod-test-dir', 0o222)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset(results);
      });
  });

  it('chmod on relative path dir 4', function () {
    let results =
      config.testServer === 'windows'
        ? [
            {
              name: 'chmod-test-dir',
              rights: {
                user: 'rwx',
                group: '***',
                other: '***',
              },
            },
          ]
        : [
            {
              name: 'chmod-test-dir',
              rights: {
                user: 'rwx',
                group: 'rwx',
                other: 'rwx',
              },
            },
          ];
    let remotePath = `../${lastRemoteDir(
      config.remoteRoot
    )}/testServer/chmod-test-dir`;
    return sftp
      .chmod(remotePath, 0o777)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset(results);
      });
  });
});
