import chai from 'chai';
const expect = chai.expect;
import {
  config,
  getConnection,
  makeLocalPath,
  removeRemoteIfExists,
} from './hooks/global-hooks.js';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('24rcopy: rcopy tests', function () {
  let sftp;
  const testSource = `${config.sftpUrl}/rcopy-test.txt`;
  const fixtures = [
    `${config.sftpUrl}/rcp-test`,
    testSource,
    `${config.sftpUrl}/rcp-1.txt`,
    `${config.sftpUrl}/rcp-2.txt`,
  ];

  before('rcopy test setup', async function () {
    sftp = await getConnection();
    for (const f of fixtures) {
      await removeRemoteIfExists(sftp, f);
    }
    await sftp.fastPut(makeLocalPath(config.localUrl, 'test-file1.txt'), testSource, {
      encoding: 'utf8',
    });
    await sftp.mkdir(`${config.sftpUrl}/rcp-test`);
    return true;
  });

  after('rcopy test cleanup', async function () {
    for (const f of fixtures) {
      await removeRemoteIfExists(sftp, f);
    }
    await sftp.end();
  });

  it('rcopy returns a promise', async function () {
    const p = sftp.rcopy(testSource, `${config.sftpUrl}/rcp-1.txt`);
    expect(p).to.be.a('promise');
    await p;
  });

  it('rcopy creates copy of same size', async function () {
    const rslt = await sftp.rcopy(testSource, `${config.sftpUrl}/rcp-2.txt`);
    expect(rslt).to.equal(`${testSource} copied to ${config.sftpUrl}/rcp-2.txt`);
    const stat1 = await sftp.stat(testSource);
    const stat2 = await sftp.stat(`${config.sftpUrl}/rcp-2.txt`);
    return expect(stat2.size).to.equal(stat1.size);
  });

  it('rcopy non-existent source fails with bad path code', async function () {
    const err = await sftp
      .rcopy(`${config.sftpUrl}/not-exist.bad`, `${config.sftpUrl}/never-happen.bad`)
      .catch((e) => e);
    expect(err).to.be.instanceOf(Error);
    expect(err.code).to.equal('ERR_BAD_PATH');
  });

  it('rcopy with a directory as source fails', function () {
    return expect(
      sftp.rcopy(`${config.sftpUrl}/rcp-test`, `${config.sftpUrl}/never-happen.bad`),
    ).to.be.rejectedWith(/Source not a file/);
  });

  it('rcopy to an unwritable destination fails', function () {
    return expect(
      sftp.rcopy(testSource, `${config.sftpUrl}/rcp-no-such-dir/copy.txt`),
    ).to.be.rejected;
  });

  it('rcopy non-existent source fails', function () {
    return expect(
      sftp.rcopy(`${config.sftpUrl}/not-exist.bad`, `${config.sftpUrl}/never-happen.bad`),
    ).to.be.rejectedWith(/Source does not exist/);
  });

  it('rcopy to existing file fails', function () {
    return expect(
      sftp.rcopy(testSource, `${config.sftpUrl}/rcp-2.txt`),
    ).to.be.rejectedWith(/Destination already exists/);
  });
});
