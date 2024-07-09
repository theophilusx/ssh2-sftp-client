import { expect as _expect, use } from 'chai';
const expect = _expect;
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import { config, getConnection } from './hooks/global-hooks.mjs';

use(chaiSubset);
use(chaiAsPromised);

describe('05stat: stat() method tests', function () {
  let sftp;

  before('stat() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('state() cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it('stat return should be a promise', function () {
    return expect(sftp.stat(config.sftpUrl)).to.be.a('promise');
  });

  it('stat on non-existent file rejected', function () {
    return expect(
      sftp.stat(config.sftpUrl + '/stat-test-not-exist.md'),
    ).to.be.rejectedWith('No such file');
  });

  it('stat on "." returns isDirectory = true', async function () {
    let data = await sftp.stat('.');
    return expect(data.isDirectory).to.equal(true);
  });

  it('stat on ".." returns isDirectory = true', async function () {
    let data = await sftp.stat('..');
    return expect(data.isDirectory).to.equal(true);
  });
});
