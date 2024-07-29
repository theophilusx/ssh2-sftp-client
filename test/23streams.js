const chai = require('chai');
const expect = chai.expect;
const { config, getConnection, makeLocalPath } = require('./hooks/global-hooks.js');
const { unlinkSync, createWriteStream, createReadStream } = require('node:fs');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

describe('23streams: create read stream tests', function () {
  let sftp;

  before('stream test setup', async function () {
    sftp = await getConnection();
    await sftp.fastPut(
      makeLocalPath(config.localUrl, 'test-file1.txt'),
      `${config.sftpUrl}/stream-read.txt`,
      { encoding: 'utf8' },
    );
    return true;
  });

  after('stream test cleanup', async function () {
    await sftp.delete(`${config.sftpUrl}/stream-read.txt`);
    unlinkSync(`${config.localUrl}/stream-t1.txt`);
    unlinkSync(`${config.localUrl}/stream-t2.txt`);
    await sftp.end();
    return true;
  });

  it('read a file to local fs', function () {
    return expect(
      new Promise((resolve, reject) => {
        const rs = sftp.createReadStream(`${config.sftpUrl}/stream-read.txt`);
        const ws = createWriteStream(`${config.localUrl}/stream-t1.txt`);
        ws.on('error', (err) => {
          reject(err);
        });
        ws.on('finish', () => {
          resolve('Data stream complete');
        });
        rs.pipe(ws);
      }),
    ).to.eventually.equal('Data stream complete');
  });

  it('read a partial file to local fs', function () {
    return expect(
      new Promise((resolve, reject) => {
        const rs = sftp.createReadStream(`${config.sftpUrl}/stream-read.txt`, {
          start: 100,
          end: 200,
        });
        const ws = createWriteStream(`${config.localUrl}/stream-t2.txt`);
        ws.on('error', (err) => {
          reject(err);
        });
        ws.on('finish', () => {
          resolve('Data stream complete');
        });
        rs.pipe(ws);
      }),
    ).to.eventually.equal('Data stream complete');
  });
});

describe('23streams B: create write stream tests', function () {
  let sftp;

  before('write stream test setup', async function () {
    sftp = await getConnection();
    return true;
  });

  after('write stream test clenaup', async function () {
    await sftp.delete(`${config.sftpUrl}/stream-t3.txt`);
    await sftp.end();
    return true;
  });

  it('write data to remote server', function () {
    return expect(
      new Promise((resolve, reject) => {
        const ws = sftp.createWriteStream(`${config.sftpUrl}/stream-t3.txt`);
        const rs = createReadStream(`${config.localUrl}/test-file1.txt`);
        ws.on('error', (err) => {
          reject(err);
        });
        ws.on('finish', () => {
          resolve('Data streamed to remote file');
        });
        ws.on('close', () => {
          resolve('Data streamed to remote file');
        });
        rs.pipe(ws);
      }),
    ).to.eventually.equal('Data streamed to remote file');
  });
});
