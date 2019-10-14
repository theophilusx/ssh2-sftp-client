'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {listSetup, listCleanup} = require('./hooks/list-hooks');
const {makeRemotePath} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('list() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('List test setup hook', async function() {
    hookSftp = await getConnection('list-hook');
    sftp = await getConnection('list');
    await listSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('list test cleanup hook', async function() {
    await listCleanup(hookSftp, config.sftpUrl);
    await closeConnection('list', sftp);
    await closeConnection('list-hook', hookSftp);
    return true;
  });

  it('list return should be a promise', function() {
    return expect(
      sftp.list(makeRemotePath(config.sftpUrl, 'list-test'))
    ).to.be.a('promise');
  });

  it('list return for empty directory should be empty', function() {
    return expect(
      sftp.list(makeRemotePath(config.sftpUrl, 'list-test/empty'))
    ).to.become([]);
  });

  it('list non-existent directory rejected', function() {
    return expect(
      sftp.list(makeRemotePath(config.sftpUrl, 'list-test/not-exist'))
    ).to.be.rejectedWith('No such file');
  });

  it('list existing dir returns details of each entry', async function() {
    let data = await sftp.list(makeRemotePath(config.sftpUrl, 'list-test'));

    expect(data.length).to.equal(7);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html'},
      {type: '-', name: 'file2.md'},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with /.*/ regexp', async function() {
    let data = await sftp.list(
      makeRemotePath(config.sftpUrl, 'list-test'),
      /.*/
    );

    expect(data.length).to.equal(7);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html'},
      {type: '-', name: 'file2.md'},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with /dir.*/ regexp', async function() {
    let data = await sftp.list(
      makeRemotePath(config.sftpUrl, 'list-test'),
      /dir.*/
    );

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'}
    ]);
  });

  it('list with leading /.*txt/ regexp', async function() {
    let data = await sftp.list(
      makeRemotePath(config.sftpUrl, 'list-test'),
      /.*txt/
    );

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with * glob pattern', async function() {
    let data = await sftp.list(
      makeRemotePath(config.sftpUrl, 'list-test'),
      '*'
    );

    expect(data.length).to.equal(7);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html'},
      {type: '-', name: 'file2.md'},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with dir* glob pattern', async function() {
    let data = await sftp.list(
      makeRemotePath(config.sftpUrl, 'list-test'),
      'dir*'
    );

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'}
    ]);
  });

  it('list with leading *txt pattern', async function() {
    let data = await sftp.list(
      makeRemotePath(config.sftpUrl, 'list-test'),
      '*txt'
    );

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with relative path', async function() {
    let data = await sftp.list('./testServer');
    return expect(data.length).to.equal(1);
  });

  it('list with "." path', async function() {
    let data = await sftp.list('.');
    return expect(data).to.containSubset([{type: 'd', name: 'testServer'}]);
  });

  it(`list with absolute path ${config.sftpUrl} and pattern`, async function() {
    let data = await sftp.list(config.sftpUrl, 'list*');
    return expect(data).to.containSubset([{name: 'list-test'}]);
  });
});

describe('auxList testing', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('List test setup hook', async function() {
    hookSftp = await getConnection('auxList-hook');
    sftp = await getConnection('auxList');
    await listSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('List test cleanup hook', async function() {
    await listCleanup(hookSftp, config.sftpUrl);
    await closeConnection('auxList', sftp);
    await closeConnection('auxList-hook', hookSftp);
    return true;
  });

  it('auxList with * pattern', async function() {
    let data = await sftp.auxList(
      makeRemotePath(config.sftpUrl, 'list-test'),
      '*'
    );

    expect(data.length).to.equal(7);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html'},
      {type: '-', name: 'file2.md'},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('auxList with dir* pattern', async function() {
    let data = await sftp.auxList(
      makeRemotePath(config.sftpUrl, 'list-test'),
      'dir*'
    );

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'}
    ]);
  });

  it('auxList with leading *txt pattern', async function() {
    let data = await sftp.auxList(
      makeRemotePath(config.sftpUrl, 'list-test'),
      '*txt'
    );

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });
});
