const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const { config, getConnection } = require('./hooks/global-hooks.js');

chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe('03list: list() method tests', function () {
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
    return expect(sftp.list(config.sftpUrl + '/list-test/not-exist')).to.be.rejectedWith(
      'No such file',
    );
  });

  it('list existing dir returns details of each entry', async function () {
    let data = await sftp.list('.');

    return expect(data).to.containSubset([{ type: 'd', name: 'testServer' }]);
  });

  it('list with relative path', async function () {
    let data = await sftp.list('./testServer');
    return expect(data.length).to.equal(0);
  });

  it('list with "." path', async function () {
    let data = await sftp.list('.');
    return expect(data).to.containSubset([{ type: 'd', name: 'testServer' }]);
  });

  it('list with ".." path', async function () {
    let data = await sftp.list('..');
    return expect(data).to.containSubset([{ type: 'd', name: 'tim' }]);
  });

  it('list with "../testServer" path', async function () {
    let data = await sftp.list('../tim');
    return expect(data).to.containSubset([{ type: 'd', name: 'testServer' }]);
  });
});

describe('03list B: list tests with filters', function () {
  let sftp;

  before('list() test setup hook', async function () {
    sftp = await getConnection();
    await sftp.put(Buffer.from('A foo file'), `${config.sftpUrl}/foo1.txt`, {
      encoding: 'utf8',
    });
    await sftp.put(Buffer.from('A scond foo file'), `${config.sftpUrl}/foo2.txt`, {
      encoding: 'utf8',
    });
    await sftp.put(Buffer.from('A bar file'), `${config.sftpUrl}/bar1.txt`, {
      encoding: 'utf8',
    });
    await sftp.put(Buffer.from('A second bar file'), `${config.sftpUrl}/bar2.txt`, {
      encoding: 'utf8',
    });
    await sftp.put(Buffer.from('A baz file'), `${config.sftpUrl}/baz1.txt`, {
      encoding: 'utf8',
    });
    await sftp.put(Buffer.from('A second bar file'), `${config.sftpUrl}/baz2.txt`, {
      encoding: 'utf8',
    });
    return true;
  });

  after('list() test cleanup hook', async function () {
    await sftp.delete(`${config.sftpUrl}/foo1.txt`);
    await sftp.delete(`${config.sftpUrl}/foo2.txt`);
    await sftp.delete(`${config.sftpUrl}/bar1.txt`);
    await sftp.delete(`${config.sftpUrl}/bar2.txt`);
    await sftp.delete(`${config.sftpUrl}/baz1.txt`);
    await sftp.delete(`${config.sftpUrl}/baz2.txt`);
    await sftp.end();
    return true;
  });

  it('basic listing', async function () {
    let files = await sftp.list(config.sftpUrl);
    return expect(files).containSubset([
      { name: 'foo1.txt' },
      { name: 'foo2.txt' },
      { name: 'bar1.txt' },
      { name: 'bar2.txt' },
      { name: 'baz1.txt' },
      { name: 'baz2.txt' },
    ]);
  });

  it('listing of just foo files', async function () {
    let flt = (item) => {
      return /foo.\.txt/.test(item.name);
    };
    let files = await sftp.list(config.sftpUrl, flt);
    return expect(files).containSubset([{ name: 'foo1.txt' }, { name: 'foo2.txt' }]);
  });

  it('listing only version 1 files', async function () {
    let flt = (item) => {
      return /.*1\.txt/.test(item.name);
    };
    let files = await sftp.list(config.sftpUrl, flt);
    return expect(files).containSubset([
      { name: 'foo1.txt' },
      { name: 'bar1.txt' },
      { name: 'baz1.txt' },
    ]);
  });
});
