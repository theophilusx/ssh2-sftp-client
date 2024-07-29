const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const checksum = require('checksum');
const { file } = require('checksum');
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks.js');
const { checksumCleanup } = require('./hooks/checksum-hooks.js');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

function getChecksum(fileName) {
  return new Promise((resolve, reject) => {
    file(fileName, (err, sum) => {
      if (err) {
        return reject(err);
      }
      return resolve(sum);
    });
  });
}

describe('18checksum: put() and get() checksum tests', function () {
  let sftp;

  before('checksum() setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('Checksum() test cleanup hook', async function () {
    await checksumCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('Large file checksum', async function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteSrc = `${config.sftpUrl}/checksum-file1.txt`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file1.txt');

    await sftp.put(localSrc, remoteSrc);
    await sftp.get(remoteSrc, localCopy);
    let srcChecksum = await getChecksum(localSrc);
    let copyChecksum = await getChecksum(localCopy);
    return expect(srcChecksum).to.equal(copyChecksum);
  });

  it('Gzipped file checksum', async function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remoteSrc = `${config.sftpUrl}/checksum-file2.txt.gz`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file2.txt.gz');

    await sftp.put(localSrc, remoteSrc);
    await sftp.get(remoteSrc, localCopy);
    let localChecksum = await getChecksum(localSrc);
    let copyChecksum = await getChecksum(localCopy);
    return expect(localChecksum).to.equal(copyChecksum);
  });
});

describe('18checksum B: fastPut() and fastGet() checksum tests', function () {
  let sftp;

  before('checksum setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('Checksum test cleanup hook', async function () {
    await checksumCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('Large file checksum', async function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteSrc = `${config.sftpUrl}/checksum-file1.txt`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file1.txt');

    await sftp.fastPut(localSrc, remoteSrc);
    await sftp.fastGet(remoteSrc, localCopy);
    let localChecksum = await getChecksum(localSrc);
    let copyChecksum = await getChecksum(localCopy);
    return expect(localChecksum).to.equal(copyChecksum);
  });

  it('Gzipped file checksum', async function () {
    let localSrc = makeLocalPath(config.localUrl, 'test-file2.txt.gz');
    let remoteSrc = `${config.sftpUrl}/checksum-file2.txt.gz`;
    let localCopy = makeLocalPath(config.localUrl, 'checksum-file2.txt.gz');

    await sftp.fastPut(localSrc, remoteSrc);
    await sftp.fastGet(remoteSrc, localCopy);
    let srcChecksum = await getChecksum(localSrc);
    let copyChecksum = await getChecksum(localCopy);
    return expect(srcChecksum).to.equal(copyChecksum);
  });
});
