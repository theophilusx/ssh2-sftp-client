'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('list() method tests', async function () {
  let sftp;

  before('list() test setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('list() test cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it('list return should be a promise', function () {
    let p = sftp.list(config.sftpUrl);
    expect(p).to.be.a('promise');
    return expect(p).to.be.fulfilled;
  });

  it('list return for empty directory should be empty', function () {
    return expect(sftp.list(config.sftpUrl)).to.become([]);
  });

  it('list non-existent directory rejected', function () {
    return expect(
      sftp.list(config.sftpUrl + '/list-test/not-exist')
    ).to.be.rejectedWith('No such file');
  });

  it('list existing dir returns details of each entry', async function () {
    let data = await sftp.list('.');

    return expect(data).to.containSubset([{type: 'd', name: 'testServer'}]);
  });

  it('list with relative path', async function () {
    let data = await sftp.list('./testServer');
    return expect(data.length).to.equal(0);
  });

  it('list with "." path', async function () {
    let data = await sftp.list('.');
    return expect(data).to.containSubset([{type: 'd', name: 'testServer'}]);
  });
});
