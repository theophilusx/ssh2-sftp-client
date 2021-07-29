'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');
const hooks = require('./hooks/mixed-hooks');

chai.use(chaiAsPromised);

describe('Mixed tests', function () {
  let sftp;

  before('Mixed test setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('Mixed test cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  describe('realPath tests', function () {
    before('realpath setup', async function () {
      await hooks.realpathSetup(sftp, config.sftpUrl, config.localUrl);
      return true;
    });

    after('realpath cleanup', async function () {
      await hooks.realpathCleanup(sftp, config.sftpUrl);
      return true;
    });

    it('returns path to test directory', async function () {
      return expect(
        sftp.realPath(config.sftpUrl + '/path-test-dir')
      ).to.eventually.equal(config.sftpUrl + '/path-test-dir');
    });

    it('return path to test file 1', async function () {
      return expect(
        sftp.realPath(config.sftpUrl + '/path-test-dir/path-file1.txt')
      ).to.eventually.equal(config.sftpUrl + '/path-test-dir/path-file1.txt');
    });

    it('return path to test file 2', async function () {
      return expect(
        sftp.realPath(config.sftpUrl + '/path-test-dir/path-file2.txt.gz')
      ).to.eventually.equal(
        config.sftpUrl + '/path-test-dir/path-file2.txt.gz'
      );
    });

    // realPath for windows does not seem to return empty string for non-existent paths
    it("realPath returns '' for non-existing path", function () {
      if (sftp.remotePlatform !== 'win32') {
        return expect(
          sftp.realPath(
            config.sftpUrl +
              '/path-test-dir/path-not-exist-dir/path-not-exist-file.txt'
          )
        ).to.eventually.equal('');
      } else {
        return expect(true).to.equal(true);
      }
    });
  });

  describe('list tests', function () {
    before('list setup', async function () {
      await hooks.listSetup(sftp, config.sftpUrl, config.localUrl);
    });

    after('list cleanup', async function () {
      await hooks.listCleanup(sftp, config.sftpUrl);
    });

    it('list return for empty directory should be empty', function () {
      return expect(sftp.list(config.sftpUrl + '/list-test/empty')).to.become(
        []
      );
    });

    it('list existing dir returns details of each entry', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test');

      expect(data.length).to.equal(7);
      return expect(data).to.containSubset([
        {type: 'd', name: 'dir1'},
        {type: 'd', name: 'dir2'},
        {type: 'd', name: 'empty'},
        {type: '-', name: 'file1.html'},
        {type: '-', name: 'file2.md'},
        {type: '-', name: 'test-file1.txt'},
        {type: '-', name: 'test-file2.txt.gz'}
      ]);
    });

    it('list with /.*/ regexp', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test', /.*/);

      expect(data.length).to.equal(7);
      return expect(data).to.containSubset([
        {type: 'd', name: 'dir1'},
        {type: 'd', name: 'dir2'},
        {type: 'd', name: 'empty'},
        {type: '-', name: 'file1.html'},
        {type: '-', name: 'file2.md'},
        {type: '-', name: 'test-file1.txt'},
        {type: '-', name: 'test-file2.txt.gz'}
      ]);
    });

    it('list with /dir.*/ regexp', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test', /dir.*/);

      expect(data.length).to.equal(2);
      return expect(data).to.containSubset([
        {type: 'd', name: 'dir1'},
        {type: 'd', name: 'dir2'}
      ]);
    });

    it('list with /.*txt/ regexp', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test', /.*txt/);

      expect(data.length).to.equal(2);
      return expect(data).to.containSubset([
        {type: '-', name: 'test-file1.txt'},
        {type: '-', name: 'test-file2.txt.gz'}
      ]);
    });

    it('list with * glob pattern', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test', '*');

      expect(data.length).to.equal(7);
      return expect(data).to.containSubset([
        {type: 'd', name: 'dir1'},
        {type: 'd', name: 'dir2'},
        {type: 'd', name: 'empty'},
        {type: '-', name: 'file1.html'},
        {type: '-', name: 'file2.md'},
        {type: '-', name: 'test-file1.txt'},
        {type: '-', name: 'test-file2.txt.gz'}
      ]);
    });

    it('list with dir* glob pattern', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test', 'dir*');

      expect(data.length).to.equal(2);
      return expect(data).to.containSubset([
        {type: 'd', name: 'dir1'},
        {type: 'd', name: 'dir2'}
      ]);
    });

    it('list with *txt pattern', async function () {
      let data = await sftp.list(config.sftpUrl + '/list-test', '*txt');

      expect(data.length).to.equal(2);
      return expect(data).to.containSubset([
        {type: '-', name: 'test-file1.txt'},
        {type: '-', name: 'test-file2.txt.gz'}
      ]);
    });

    it(`list with absolute path ${config.sftpUrl} and pattern`, async function () {
      let data = await sftp.list(config.sftpUrl, 'list*');
      return expect(data).to.containSubset([{name: 'list-test'}]);
    });
  });

  describe('Mixed exists tests', function () {
    before('exists() test setup hook', async function () {
      await hooks.existSetup(sftp, config.sftpUrl, config.localUrl);
      return true;
    });

    after('exist() test cleanup hook', async function () {
      await hooks.existCleanup(sftp, config.sftpUrl);
      return true;
    });

    it('exist returns truthy for existing file', function () {
      return expect(
        sftp.exists(`${config.sftpUrl}/exist-file.txt`)
      ).to.eventually.equal('-');
    });

    it('exist returns true for file in sub-dir', function () {
      return expect(
        sftp.exists(`${config.sftpUrl}/exist-test-dir/exist-gzip.txt.gz`)
      ).to.eventually.equal('-');
    });
  });

  describe('Mixed stat tests', async () => {
    before('stat setup hook', async function () {
      await hooks.statSetup(sftp, config.sftpUrl);
      return true;
    });

    after('stat cleanup hook', async function () {
      await hooks.statCleanup(sftp, config.sftpUrl);
      return true;
    });

    it('stat on existing file returns stat data', async function () {
      let stats = await sftp.stat(config.sftpUrl + '/stat-test.md');

      return expect(stats).to.containSubset({
        size: 16,
        isFile: true
      });
    });
  });
});
