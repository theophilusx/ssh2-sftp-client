const chai = require('chai');
const expect = chai.expect;
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks.js');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

describe('24rcopy: rcopy tests', function () {
  let sftp;
  const testSource = `${config.sftpUrl}/rcopy-test.txt`;

  before('rcopy test setup', async function () {
    sftp = await getConnection();
    await sftp.fastPut(makeLocalPath(config.localUrl, 'test-file1.txt'), testSource, {
      encoding: 'utf8',
    });
    await sftp.mkdir(`${config.sftpUrl}/rcp-test`);
    return true;
  });

  after('rcopy test cleanup', async function () {
    await sftp.rmdir(`${config.sftpUrl}/rcp-test`, true);
    await sftp.delete(testSource);
    await sftp.delete(`${config.sftpUrl}/rcp-1.txt`);
    await sftp.delete(`${config.sftpUrl}/rcp-2.txt`);
    await sftp.end();
  });

  it('rcopy returns a promise', function () {
    return expect(sftp.rcopy(testSource, `${config.sftpUrl}/rcp-1.txt`)).to.be.a(
      'promise',
    );
  });

  it('rcopy creates copy of same size', async function () {
    const rslt = await sftp.rcopy(testSource, `${config.sftpUrl}/rcp-2.txt`);
    expect(rslt).to.equal(`${testSource} copied to ${config.sftpUrl}/rcp-2.txt`);
    const stat1 = await sftp.stat(testSource);
    const stat2 = await sftp.stat(`${config.sftpUrl}/rcp-2.txt`);
    return expect(stat1.size === stat2.size);
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
