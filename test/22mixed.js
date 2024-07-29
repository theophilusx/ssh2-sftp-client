const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const { config, getConnection } = require('./hooks/global-hooks');
const hooks = require('./hooks/mixed-hooks');

chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe('realPath tests', function () {
  let sftp;

  before('realpath setup', async function () {
    sftp = await getConnection();
    await hooks.realpathSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('realpath cleanup', async function () {
    await hooks.realpathCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('returns path to test directory', function () {
    return expect(sftp.realPath(config.sftpUrl + '/path-test-dir')).to.eventually.equal(
      config.sftpUrl + '/path-test-dir',
    );
  });

  it('return path to test file 1', function () {
    return expect(
      sftp.realPath(config.sftpUrl + '/path-test-dir/path-file1.txt'),
    ).to.eventually.equal(config.sftpUrl + '/path-test-dir/path-file1.txt');
  });

  it('return path to test file 2', function () {
    return expect(
      sftp.realPath(config.sftpUrl + '/path-test-dir/path-file2.txt.gz'),
    ).to.eventually.equal(config.sftpUrl + '/path-test-dir/path-file2.txt.gz');
  });

  it('realPath returns empty for non-existing path', function () {
    return config.testServer !== 'windows'
      ? expect(
          sftp.realPath(
            config.sftpUrl + '/path-test-dir/path-not-exist-dir/path-not-exist-file.txt',
          ),
        ).to.eventually.equal('')
      : expect(true).to.equal(true);
  });
});

describe('list tests', function () {
  let sftp;

  before('list setup', async function () {
    sftp = await getConnection();
    await hooks.listSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('list cleanup', async function () {
    await hooks.listCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('list return for empty directory should be empty', function () {
    return expect(sftp.list(config.sftpUrl + '/list-test/empty')).to.become([]);
  });

  it('list existing dir returns details of each entry', async function () {
    const data = await sftp.list(config.sftpUrl + '/list-test');

    expect(data.length).to.equal(7);
    return expect(data).to.containSubset([
      { type: 'd', name: 'dir1' },
      { type: 'd', name: 'dir2' },
      { type: 'd', name: 'empty' },
      { type: '-', name: 'file1.html' },
      { type: '-', name: 'file2.md' },
      { type: '-', name: 'test-file1.txt' },
      { type: '-', name: 'test-file2.txt.gz' },
    ]);
  });

  it('list with /.*/ regexp', async function () {
    const filter = () => true;
    const data = await sftp.list(config.sftpUrl + '/list-test', filter);

    expect(data.length).to.equal(7);
    return expect(data).to.containSubset([
      { type: 'd', name: 'dir1' },
      { type: 'd', name: 'dir2' },
      { type: 'd', name: 'empty' },
      { type: '-', name: 'file1.html' },
      { type: '-', name: 'file2.md' },
      { type: '-', name: 'test-file1.txt' },
      { type: '-', name: 'test-file2.txt.gz' },
    ]);
  });

  it('list with /dir.*/ regexp', async function () {
    const filter = (item) => {
      if (item.type === 'd' && item.name.startsWith('dir')) {
        return true;
      }
      return false;
    };
    const data = await sftp.list(config.sftpUrl + '/list-test', filter);

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      { type: 'd', name: 'dir1' },
      { type: 'd', name: 'dir2' },
    ]);
  });

  it('list with /.*txt/ regexp', async function () {
    const filter = (item) => item.name.endsWith('txt') || item.name.endsWith('txt.gz');
    const data = await sftp.list(config.sftpUrl + '/list-test', filter);

    expect(data.length).to.equal(2);
    return expect(data).to.containSubset([
      { type: '-', name: 'test-file1.txt' },
      { type: '-', name: 'test-file2.txt.gz' },
    ]);
  });
});

describe('Mixed exists tests', function () {
  let sftp;

  before('exists() test setup hook', async function () {
    sftp = await getConnection();
    await hooks.existSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('exist() test cleanup hook', async function () {
    await hooks.existCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('exist returns truthy for existing file', function () {
    return expect(sftp.exists(`${config.sftpUrl}/exist-file.txt`)).to.eventually.equal(
      '-',
    );
  });

  it('exist returns true for file in sub-dir', function () {
    return expect(
      sftp.exists(`${config.sftpUrl}/exist-test-dir/exist-gzip.txt.gz`),
    ).to.eventually.equal('-');
  });
});

describe('Mixed stat tests', function () {
  let sftp;

  before('stat setup hook', async function () {
    sftp = await getConnection();
    await hooks.statSetup(sftp, config.sftpUrl);
    return true;
  });

  after('stat cleanup hook', async function () {
    await hooks.statCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('stat on existing file returns stat data', async function () {
    let stats = await sftp.stat(config.sftpUrl + '/stat-test.md');

    return expect(stats).to.containSubset({
      size: 16,
      isFile: true,
    });
  });
});
