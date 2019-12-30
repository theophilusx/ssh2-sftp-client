'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {permissionSetup, permissionCleanup} = require('./hooks/permission-hook');
const {makeLocalPath, makeRemotePath} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Bad permission tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('FastPut setup hook', async function() {
    hookSftp = await getConnection('fastput-hook');
    sftp = await getConnection('fastput');
    await permissionSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('FastPut cleanup hook', async function() {
    await permissionCleanup(hookSftp, config.sftpUrl);
    await closeConnection('fastput', sftp);
    await closeConnection('fastput-hook', hookSftp);
    return true;
  });

  describe('No access to local file', function() {
    it('fastPut throws exception', function() {
      return expect(
        sftp.fastPut(
          makeLocalPath(config.localUrl, 'no-access.txt'),
          makeRemotePath(config.sftpUrl, 'no-access1.txt')
        )
      ).be.rejectedWith('Permission denied');
    });

    it('put throws exception', function() {
      return expect(
        sftp.put(
          makeLocalPath(config.localUrl, 'no-access.txt'),
          makeRemotePath(config.sftpUrl, 'no-access1.txt')
        )
      ).be.rejectedWith('Permission denied');
    });
  });

  describe('No access to remote object', function() {
    it('fastget throws exception', function() {
      return expect(
        sftp.fastGet(
          makeRemotePath(config.sftpUrl, 'no-access-get.txt'),
          makeLocalPath(config.localUrl, 'no-access-fastget.txt')
        )
      ).be.rejectedWith('Permission denied');
    });

    it('get throws exception', function() {
      return expect(
        sftp.get(
          makeRemotePath(config.sftpUrl, 'no-access-get.txt'),
          makeLocalPath(config.localUrl, 'no-access-get.txt')
        )
      ).be.rejectedWith('No read permission');
    });

    it('list throws exception', function() {
      return expect(
        sftp.list(makeRemotePath(config.sftpUrl, 'no-access-dir/sub-dir'))
      ).be.rejectedWith('Permission denied');
    });

    it('exists throws exception', function() {
      return expect(
        sftp.exists(makeRemotePath(config.sftpUrl, 'no-access-dir/sub-dir'))
      ).be.rejectedWith('Permission denied');
    });

    it('stat throws exception', function() {
      return expect(
        sftp.stat(makeRemotePath(config.sftpUrl, 'no-access-dir/sub-dir'))
      ).be.rejectedWith('Permission denied');
    });

    it('append throws exception', function() {
      return expect(
        sftp.append(
          Buffer.from('Should not work'),
          makeRemotePath(config.sftpUrl, 'no-access-get.txt')
        )
      ).be.rejectedWith('No write permission');
    });

    it('mkdir throws exception', function() {
      return expect(
        sftp.stat(
          makeRemotePath(config.sftpUrl, 'no-access-dir/not-work'),
          true
        )
      ).be.rejectedWith('Permission denied');
    });

    it('rmdir throws exception', function() {
      return expect(
        sftp.rmdir(
          makeRemotePath(config.sftpUrl, 'no-access-dir/sub-dir'),
          true
        )
      ).be.rejectedWith('Permission denied');
    });

    it('delete throws exception', function() {
      return expect(
        sftp.delete(
          makeRemotePath(
            config.sftpUrl,
            'no-access-dir',
            'sub-dir',
            'permission-gzip.txt.gz'
          )
        )
      ).be.rejectedWith('Permission denied');
    });

    it('rename throws exception', function() {
      return expect(
        sftp.rename(
          makeRemotePath(
            config.sftpUrl,
            'no-access-dir',
            'sub-dir',
            'permission-gzip.txt.gz'
          ),
          makeRemotePath(
            config.sftpUrl,
            'no-acceass-dir',
            'sub-dir',
            'permission-rename.gzip.txt.gz'
          )
        )
      ).be.rejectedWith('Permission denied');
    });

    it('chmod throws exception', function() {
      return expect(
        sftp.chmod(
          makeRemotePath(
            config.sftpUrl,
            'no-access-dir',
            'sub-dir',
            'permission-gzip.txt.gz'
          ),
          0o777
        )
      ).be.rejectedWith('Permission denied');
    });
  });
});
