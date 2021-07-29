'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {config, getConnection} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('exists() method tests', async () => {
  let sftp;

  before('exists() test setup hook', async function () {
    sftp = await getConnection();
    return true;
  });

  after('exists() test cleanup hook', async function () {
    await sftp.end();
    return true;
  });

  it('exist return should be a promise', function () {
    return expect(sftp.exists(config.sftpUrl)).to.be.a('promise');
  });

  it('exists returns truthy for existing directory', function () {
    return expect(sftp.exists(`${config.sftpUrl}`)).to.eventually.equal('d');
  });

  it('exist returns true for "." dir', function () {
    return expect(sftp.exists('.')).to.eventually.equal('d');
  });

  it('exists returns true for relative path on existing dir', async function () {
    return expect(sftp.exists('./testServer')).to.eventually.equal('d');
  });

  it('Exists return false value for non existent dir', function () {
    return expect(
      sftp.exists(`${config.sftpUrl}/no-such-dir/subdir`)
    ).to.eventually.equal(false);
  });

  it('exists return false for bad path', function () {
    return expect(sftp.exists('just/a/really/bad/path')).to.eventually.equal(
      false
    );
  });
});
