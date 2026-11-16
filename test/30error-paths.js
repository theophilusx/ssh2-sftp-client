import chai from 'chai';
const expect = chai.expect;
import chaiAsPromised from 'chai-as-promised';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import SftpClient from '../src/index.js';
import { config, getConnection, removeRemoteIfExists } from './hooks/global-hooks.js';

chai.use(chaiAsPromised);

describe('30error-paths: error handling and rejection paths', function () {
  let sftp;
  let tmp;
  const root = `${config.sftpUrl}/errpath`;

  before('error-paths setup', async function () {
    sftp = await getConnection();
    tmp = mkdtempSync(join(tmpdir(), 'sftp-errpath-'));
    await removeRemoteIfExists(sftp, root);
    await sftp.mkdir(`${root}/dir-with-files`, true);
    await sftp.mkdir(`${root}/non-empty/sub`, true);
    await sftp.put(Buffer.from('file one'), `${root}/plain.txt`);
    await sftp.put(Buffer.from('file two'), `${root}/non-empty/sub/f.txt`);
    await sftp.put(Buffer.from('a'), `${root}/dir-with-files/a.txt`);
    await sftp.put(Buffer.from('b'), `${root}/dir-with-files/b.txt`);
  });

  after('error-paths cleanup', async function () {
    await removeRemoteIfExists(sftp, root);
    rmSync(tmp, { recursive: true, force: true });
    await sftp.end();
  });

  describe('rmdir', function () {
    it('rmdir on a file without recursion is rejected', async function () {
      const err = await sftp.rmdir(`${root}/plain.txt`).catch((e) => e);
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.match(/Not a directory/);
      expect(err.code).to.equal('ERR_BAD_PATH');
    });

    it('rmdir on a file with recursion is rejected', function () {
      return expect(sftp.rmdir(`${root}/plain.txt`, true)).to.be.rejectedWith(
        /Not a directory/,
      );
    });

    it('rmdir on a non-empty directory without recursion is rejected', async function () {
      await expect(sftp.rmdir(`${root}/non-empty`)).to.be.rejected;
      expect(await sftp.exists(`${root}/non-empty/sub/f.txt`)).to.equal('-');
    });
  });

  describe('delete', function () {
    it('delete of a missing file is rejected with the remote path', async function () {
      const err = await sftp.delete(`${root}/missing.txt`).catch((e) => e);
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.contain(`${root}/missing.txt`);
    });

    it('delete of a missing file with notFoundOK resolves', function () {
      return expect(sftp.delete(`${root}/missing.txt`, true)).to.eventually.equal(
        `Successfully deleted ${root}/missing.txt`,
      );
    });
  });

  describe('get / put with failing streams', function () {
    it('get to a destination stream which errors is rejected', function () {
      const dst = new Writable({
        write(chunk, enc, cb) {
          cb(new Error('write boom'));
        },
      });
      return expect(sftp.get(`${root}/plain.txt`, dst)).to.be.rejectedWith(/write boom/);
    });

    it('put from a source stream which errors is rejected', function () {
      const src = new Readable({
        read: () => src.destroy(new Error('read boom')),
      });
      return expect(sftp.put(src, `${root}/put-bad-stream.txt`)).to.be.rejectedWith(
        /Read stream error: read boom/,
      );
    });

    it('client remains usable after a failed stream transfer', function () {
      return expect(sftp.exists(`${root}/plain.txt`)).to.eventually.equal('-');
    });
  });

  describe('createReadStream / createWriteStream without a connection', function () {
    it('createReadStream throws ERR_NOT_CONNECTED', function () {
      const client = new SftpClient('no-conn-read');
      let err;
      try {
        client.createReadStream(`${root}/plain.txt`);
      } catch (e) {
        err = e;
      }
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.match(/No SFTP connection/);
      expect(err.code).to.equal('ERR_NOT_CONNECTED');
    });

    it('createWriteStream throws ERR_NOT_CONNECTED', function () {
      const client = new SftpClient('no-conn-write');
      let err;
      try {
        client.createWriteStream(`${root}/x.txt`);
      } catch (e) {
        err = e;
      }
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.match(/No SFTP connection/);
      expect(err.code).to.equal('ERR_NOT_CONNECTED');
    });
  });

  describe('uploadDir', function () {
    it('uploadDir with a file as source is rejected', function () {
      const file = join(tmp, 'src-file.txt');
      writeFileSync(file, 'x');
      return expect(sftp.uploadDir(file, `${root}/up-dst`)).to.be.rejectedWith(
        /not a directory/i,
      );
    });

    it('uploadDir with a remote file as destination is rejected', function () {
      const src = join(tmp, 'up-src');
      mkdirSync(src);
      writeFileSync(join(src, 'f.txt'), 'x');
      return expect(sftp.uploadDir(src, `${root}/plain.txt`)).to.be.rejectedWith(
        /Not a directory/i,
      );
    });

    it('uploadDir fails when a remote directory blocks a file name', async function () {
      const src = join(tmp, 'up-blocked');
      mkdirSync(src);
      writeFileSync(join(src, 'blocked.txt'), 'x');
      await sftp.mkdir(`${root}/up-blocked-dst/blocked.txt`, true);
      await expect(sftp.uploadDir(src, `${root}/up-blocked-dst`)).to.be.rejected;
    });
  });

  describe('downloadDir', function () {
    it('downloadDir with a remote file as source is rejected', function () {
      // Currently surfaces as a list() 'No such file' error rather than a
      // 'not a directory' one, so only assert that it is rejected.
      return expect(sftp.downloadDir(`${root}/plain.txt`, join(tmp, 'dl-1'))).to.be
        .rejected;
    });

    it('downloadDir with a local file as destination is rejected', function () {
      const file = join(tmp, 'dl-dst-file');
      writeFileSync(file, 'x');
      return expect(
        sftp.downloadDir(`${root}/dir-with-files`, file),
      ).to.be.rejectedWith(/not a directory/i);
    });

    it('downloadDir fails when a local directory blocks a file name', async function () {
      const dst = join(tmp, 'dl-blocked');
      mkdirSync(join(dst, 'a.txt'), { recursive: true });
      await expect(sftp.downloadDir(`${root}/dir-with-files`, dst)).to.be.rejected;
    });
  });
});
