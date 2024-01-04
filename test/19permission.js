'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks');
const { permissionSetup, permissionCleanup } = require('./hooks/permission-hook');
const { unlinkSync } = require('node:fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

if (config.testServer !== 'windows') {
  describe('Bad permission tests', function () {
    describe('No access to local file', function () {
      let sftp;

      before('FastPut() setup hook', async function () {
        sftp = await getConnection();
        await permissionSetup(sftp, config.sftpUrl, config.localUrl);
        return true;
      });

      after('FastPut() cleanup hook', async function () {
        await permissionCleanup(sftp, config.sftpUrl);
        await sftp.end();
        return true;
      });

      it('fastPut throws exception', function () {
        return expect(
          sftp.fastPut(
            makeLocalPath(config.localUrl, 'no-access.txt'),
            `${config.sftpUrl}/no-access1.txt`,
          ),
        ).be.rejectedWith('permission denied');
      });

      it('put throws exception', function () {
        return expect(
          sftp.put(
            makeLocalPath(config.localUrl, 'no-access.txt'),
            `${config.sftpUrl}/no-access2.txt`,
          ),
        ).be.rejectedWith('permission denied');
      });
    });

    describe('No access to remote object', function () {
      let sftp;

      before('FastPut() setup hook', async function () {
        sftp = await getConnection();
        await permissionSetup(sftp, config.sftpUrl, config.localUrl);
        return true;
      });

      after('FastPut() cleanup hook', async function () {
        unlinkSync(makeLocalPath(config.localUrl, 'no-access-get.txt'));
        await permissionCleanup(sftp, config.sftpUrl);
        await sftp.end();
        return true;
      });

      it('fastget throws exception', function () {
        return expect(
          sftp.fastGet(
            config.sftpUrl + '/no-access-get.txt',
            makeLocalPath(config.localUrl, 'no-access-fastget.txt'),
          ),
        ).be.rejectedWith('Permission denied');
      });

      it('get throws exception', function () {
        return expect(
          sftp.get(
            `${config.sftpUrl}/no-access-get.txt`,
            makeLocalPath(config.localUrl, 'no-access-get.txt'),
          ),
        ).be.rejectedWith('Permission denied');
      });

      it('list throws exception', function () {
        return expect(
          sftp.list(`${config.sftpUrl}/no-access-dir/sub-dir`),
        ).be.rejectedWith('Permission denied');
      });

      it('exists throws exception', function () {
        return expect(
          sftp.exists(`${config.sftpUrl}/no-access-dir/sub-dir`),
        ).be.rejectedWith('Permission denied');
      });

      it('stat throws exception', function () {
        return expect(
          sftp.stat(`${config.sftpUrl}/no-access-dir/sub-dir`),
        ).be.rejectedWith('Permission denied');
      });

      it('append throws exception', function () {
        return expect(
          sftp.append(
            Buffer.from('Should not work'),
            `${config.sftpUrl}/no-access-get.txt`,
          ),
        ).be.rejectedWith('Permission denied');
      });

      it('mkdir throws exception', function () {
        return expect(
          sftp.stat(`${config.sftpUrl}/no-access-dir/not-work`, true),
        ).be.rejectedWith('Permission denied');
      });

      it('rmdir throws exception', function () {
        return expect(
          sftp.rmdir(`${config.sftpUrl}/no-access-dir/sub-dir`, true),
        ).be.rejectedWith('Permission denied');
      });

      it('delete throws exception', function () {
        return expect(
          sftp.delete(`${config.sftpUrl}/no-access-dir/sub-dir/permission-gzip.txt.gz`),
        ).be.rejectedWith('Permission denied');
      });

      it('rename throws exception', function () {
        return expect(
          sftp.rename(
            `${config.sftpUrl}/no-access-dir/sub-dir/permission-gzip.txt.gz`,
            `${config.sftpUrl}/no-acceass-dir/sub-dir/permission-rename.gzip.txt.gz`,
          ),
        ).be.rejectedWith('Permission denied');
      });

      it('chmod throws exception', function () {
        return expect(
          sftp.chmod(
            `${config.sftpUrl}/no-access-dir/sub-dir/permission-gzip.txt.gz`,
            0o777,
          ),
        ).be.rejectedWith('Permission denied');
      });
    });
  });
}
