'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const lHooks = require('./hooks/list-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('list method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('List test setup hook', async function() {
    hookSftp = await getConnection('list-hook');
    sftp = await getConnection('list');
    await lHooks.listSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('List test cleanup hook', async function() {
    await lHooks.listCleanup(hookSftp, config.sftpUrl);
    await closeConnection('list', sftp);
    await closeConnection('list-hook', hookSftp);
    return true;
  });

  it('list return should be a promise', function() {
    return expect(sftp.list(join(config.sftpUrl, 'mocha-list'))).to.be.a(
      'promise'
    );
  });

  it('list return on empty directory should be empty', function() {
    return expect(
      sftp.list(join(config.sftpUrl, 'mocha-list/empty'))
    ).to.become([]);
  });

  it('list non-existent directory rejected', function() {
    return expect(
      sftp.list(join(config.sftpUrl, 'mocha-list/not-exist'))
    ).to.be.rejectedWith('No such file');
  });

  it('list existing dir returns details of each entry', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'));

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html', size: 11},
      {type: '-', name: 'file2.md', size: 11},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with /.*/ regexp', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'), /.*/);

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html', size: 11},
      {type: '-', name: 'file2.md', size: 11},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with /dir.*/ regexp', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'), /dir.*/);

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'}
    ]);
  });

  it('list with leading /.*txt/ regexp', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'), /.*txt/);

    return expect(list).to.containSubset([
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with * pattern', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'), '*');

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html', size: 11},
      {type: '-', name: 'file2.md', size: 11},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('list with dir* pattern', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'), 'dir*');

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'}
    ]);
  });

  it('list with leading *txt pattern', async function() {
    let list = await sftp.list(join(config.sftpUrl, 'mocha-list'), '*txt');

    return expect(list).to.containSubset([
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
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
    await lHooks.listSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('List test cleanup hook', async function() {
    await lHooks.listCleanup(hookSftp, config.sftpUrl);
    await closeConnection('auxList', sftp);
    await closeConnection('auxList-hook', hookSftp);
    return true;
  });

  it('auxList with * pattern', async function() {
    let list = await sftp.auxList(join(config.sftpUrl, 'mocha-list'), '*');

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'},
      {type: 'd', name: 'empty'},
      {type: '-', name: 'file1.html', size: 11},
      {type: '-', name: 'file2.md', size: 11},
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });

  it('auxList with dir* pattern', async function() {
    let list = await sftp.auxList(join(config.sftpUrl, 'mocha-list'), 'dir*');

    return expect(list).to.containSubset([
      {type: 'd', name: 'dir1'},
      {type: 'd', name: 'dir2'}
    ]);
  });

  it('auxList with leading *txt pattern', async function() {
    let list = await sftp.auxList(join(config.sftpUrl, 'mocha-list'), '*txt');

    return expect(list).to.containSubset([
      {type: '-', name: 'test-file1.txt', size: 6973257},
      {type: '-', name: 'test-file2.txt.gz', size: 570314}
    ]);
  });
});
