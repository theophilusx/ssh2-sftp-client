const chai = require('chai');
const expect = chai.expect;
const { config, getConnection } = require('./hooks/global-hooks');
const { streamSetup, streamCleanup } = require('./hooks/stream-hooks');
const fs = require('fs');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

describe('create read stream tests', function () {
  let sftp;

  before('stream test setup', async function () {
    sftp = await getConnection();
    await streamSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('stream test cleanup', async function () {
    await streamCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('read a file to local fs', function () {
    return expect(
      new Promise((resolve, reject) => {
        const rs = sftp.createReadStream(`${config.sftpUrl}/stream-read.txt`);
        const ws = fs.createWriteStream(`${config.localUrl}/stream-t1.txt`);
        ws.on('error', (err) => {
          reject(err);
        });
        ws.on('finish', () => {
          resolve('Data stream complete');
        });
        rs.pipe(ws);
      })
    ).to.eventually.equal('Data stream complete');
  });

  it('read a partial file to local fs', function () {
    return expect(
      new Promise((resolve, reject) => {
        const rs = sftp.createReadStream(`${config.sftpUrl}/stream-read.txt`, {start: 100, end: 200});
        const ws = fs.createWriteStream(`${config.localUrl}/stream-t2.txt`);
        ws.on('error', (err) => {
          reject(err);
        });
        ws.on('finish', () => {
          console.log('ws finish event fired');
          resolve('Data stream complete');
        });
        ws.on('end', () => {
          console.log('ws end event fired');
        });
        ws.on('close', () => {
          console.log('ws close event fired');
        });
        rs.pipe(ws);
      })
    ).to.eventually.equal('Data stream complete');
  });
});

describe('create write stream tests', function() {
  let sftp;

  before('write stream test setup', async function() {
    sftp = await getConnection();
    return true;
  })

  it('write data to remote server', function() {
    return expect(
      new Promise((resolve, reject) => {
        const ws = sftp.createWriteStream(`${config.sftpUrl}/stream-t3.txt`);
        const rs = fs.createReadStream(`${config.localUrl}/test-file1.txt`);
        ws.on('error', (err) => {
          reject(err);
        });
        ws.on('finish', () => {
          console.log('ws finish event fired');
          resolve('Data streamed to remote file');
        });
        ws.on('end', () => {
          console.log('ws end event fired');
        });
        ws.on('close', () => {
          console.log('ws close event fired');
          resolve('Data streamed to remote file');
        });
        rs.pipe(ws);
      })
    ).to.eventually.equal('Data streamed to remote file');
  });
});
