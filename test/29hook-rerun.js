import chai from 'chai';
const expect = chai.expect;
import chaiAsPromised from 'chai-as-promised';
import {
  config,
  getConnection,
  removeRemoteIfExists,
} from './hooks/global-hooks.js';
import { putCleanup } from './hooks/put-hooks.js';
import { permissionSetup, permissionCleanup } from './hooks/permission-hook.js';

chai.use(chaiAsPromised);

describe('29hook-rerun: test hooks tolerate leftover remote data', function () {
  let sftp;

  before('connect', async function () {
    sftp = await getConnection();
  });

  after('close', async function () {
    await sftp.end();
  });

  describe('removeRemoteIfExists()', function () {
    it('removes a nested directory and reports true, then false', async function () {
      const dir = `${config.sftpUrl}/rerun-tmp`;
      await sftp.mkdir(`${dir}/a/b`, true);
      await sftp.put(Buffer.from('x'), `${dir}/a/b/f.txt`);
      expect(await removeRemoteIfExists(sftp, dir)).to.equal(true);
      expect(await sftp.exists(dir)).to.equal(false);
      expect(await removeRemoteIfExists(sftp, dir)).to.equal(false);
    });

    it('removes a file and reports true, then false', async function () {
      const file = `${config.sftpUrl}/rerun-file.txt`;
      await sftp.put(Buffer.from('x'), file);
      expect(await removeRemoteIfExists(sftp, file)).to.equal(true);
      expect(await sftp.exists(file)).to.equal(false);
      expect(await removeRemoteIfExists(sftp, file)).to.equal(false);
    });

    if (config.testServer !== 'windows') {
      it('removes a directory with mode 000', async function () {
        const dir = `${config.sftpUrl}/rerun-noaccess`;
        await sftp.mkdir(dir);
        await sftp.chmod(dir, 0o000);
        expect(await removeRemoteIfExists(sftp, dir)).to.equal(true);
        expect(await sftp.exists(dir)).to.equal(false);
      });
    }
  });

  describe('removeRemoteIfExists() guards', function () {
    it('refuses a path outside the test root', async function () {
      await expect(removeRemoteIfExists(sftp, '/tmp/not-ours')).to.be.rejectedWith(/outside/);
    });

    it('refuses the test root itself', async function () {
      await expect(removeRemoteIfExists(sftp, config.sftpUrl)).to.be.rejectedWith(/outside/);
    });

    it('refuses the test root written with a trailing slash', async function () {
      await expect(removeRemoteIfExists(sftp, `${config.sftpUrl}/`)).to.be.rejectedWith(/outside/);
    });

    it('refuses a path that escapes the test root with ..', async function () {
      await expect(
        removeRemoteIfExists(sftp, `${config.sftpUrl}/../escape-target`),
      ).to.be.rejectedWith(/outside/);
    });

    it('refuses a sibling whose name starts with the root name', async function () {
      await expect(
        removeRemoteIfExists(sftp, `${config.sftpUrl}-sibling/x`),
      ).to.be.rejectedWith(/outside/);
    });

    if (config.testServer !== 'windows') {
      it('removes a symlink without touching its target', async function () {
        const target = `${config.sftpUrl}/rerun-link-target`;
        const link = `${config.sftpUrl}/rerun-link`;
        await removeRemoteIfExists(sftp, link);
        await removeRemoteIfExists(sftp, target);
        await sftp.mkdir(target);
        await sftp.put(Buffer.from('keep'), `${target}/keep.txt`);
        await new Promise((resolve, reject) => {
          sftp.sftp.symlink(target, link, (err) => (err ? reject(err) : resolve()));
        });
        expect(await sftp.exists(link)).to.equal('l');
        expect(await removeRemoteIfExists(sftp, link)).to.equal(true);
        expect(await sftp.exists(link)).to.equal(false);
        expect(await sftp.exists(`${target}/keep.txt`)).to.equal('-');
        await removeRemoteIfExists(sftp, target);
      });
    }
  });

  describe('cleanup hooks', function () {
    it('putCleanup removes later fixtures when an earlier one is missing', async function () {
      const later = `${config.sftpUrl}/put-promise.txt`;
      await removeRemoteIfExists(sftp, `${config.sftpUrl}/put-large.txt`);
      await sftp.put(Buffer.from('leftover'), later);
      expect(await putCleanup(sftp, config.sftpUrl)).to.equal(true);
      expect(await sftp.exists(later)).to.equal(false);
    });
  });

  if (config.testServer !== 'windows') {
    describe('setup hooks', function () {
      after('cleanup', async function () {
        await permissionCleanup(sftp, config.sftpUrl);
      });

      it('permissionSetup succeeds when a previous run left no-access-dir behind', async function () {
        expect(await permissionSetup(sftp, config.sftpUrl, config.localUrl)).to.equal(true);
        expect(await permissionSetup(sftp, config.sftpUrl, config.localUrl)).to.equal(true);
      });
    });
  }
});
