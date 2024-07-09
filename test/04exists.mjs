import { expect as _expect, use } from 'chai';
const expect = _expect;
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import { config, getConnection } from './hooks/global-hooks.mjs';

use(chaiSubset);
use(chaiAsPromised);

describe('04exists: exists() method tests', function () {
  let sftp;

  before('exists() test setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('exists() test cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it('exist return should be a promise', function () {
    return expect(sftp.exists(config.sftpUrl)).to.be.a('promise');
  });

  it('exists returns truthy for existing directory', function () {
    return expect(sftp.exists(`${config.sftpUrl}`)).to.eventually.equal('d');
  });

  it('exist returns true for "." dir', function () {
    return expect(sftp.exists('.')).to.eventually.equal('d');
  });

  it('exists returns true for relative path on existing dir', async function () {
    return expect(sftp.exists('./testServer')).to.eventually.equal('d');
  });

  it('Exists return false value for non existent dir', function () {
    return expect(
      sftp.exists(`${config.sftpUrl}/no-such-dir/subdir`),
    ).to.eventually.equal(false);
  });

  it('exists return false for bad path', function () {
    return expect(sftp.exists('just/a/really/bad/path')).to.eventually.equal(false);
  });

  it('exists returns false for non-file/non-dir', function () {
    return expect(sftp.exists('/dev/tty')).to.eventually.equal(false);
  });
});
