// Regression tests for path traversal in downloadDir() (CWE-22).
// Names in a remote directory listing come from the server and must never
// be allowed to resolve outside the local destination directory. These tests
// need no SFTP server - list/get/_fastGet are stubbed.
import chai from 'chai';
const expect = chai.expect;
import chaiAsPromised from 'chai-as-promised';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import SftpClient from '../src/index.js';
import { errorCode } from '../src/constants.js';
import { isSafeEntryName } from '../src/utils.js';

chai.use(chaiAsPromised);

const quiet = { error: () => {}, end: () => {}, close: () => {} };

// listings: map of remote dir -> array of {name, type}
function makeClient(listings) {
  const client = new SftpClient('traversal', quiet);
  client.sftp = {};
  const calls = [];
  client.list = async (dir) => {
    if (!(dir in listings)) {
      throw new Error(`unexpected list of ${dir}`);
    }
    return listings[dir];
  };
  const record = async (src, dst) => {
    calls.push({ src, dst });
    fs.writeFileSync(dst, 'downloaded');
    return dst;
  };
  client.get = record;
  client._fastGet = record;
  return { client, calls };
}

const file = (name) => ({ name, type: '-' });
const dir = (name) => ({ name, type: 'd' });

describe('32downloaddir traversal', function () {
  let root;
  let dst;
  let victim;

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sftp-traversal-'));
    dst = path.join(root, 'downloads');
    victim = path.join(root, 'victim.txt');
    fs.writeFileSync(victim, 'ORIGINAL');
  });

  afterEach(function () {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const badNames = [
    '../victim.txt',
    '../../victim.txt',
    '..',
    '.',
    '',
    'sub/../../victim.txt',
    'a/b',
    String.raw`a\b`,
    String.raw`..\victim.txt`,
    '/etc/passwd',
    String.raw`C:\victim.txt`,
    'bad\0name',
  ];

  for (const useFastget of [false, true]) {
    for (const name of badNames) {
      const label = JSON.stringify(name);

      it(`rejects file entry ${label} (useFastget=${useFastget})`, async function () {
        const { client, calls } = makeClient({ '/remote': [file(name)] });
        const err = await client
          .downloadDir('/remote', dst, { useFastget })
          .catch((e) => e);
        expect(err).to.be.instanceOf(Error);
        expect(err.code).to.equal(errorCode.badPath);
        expect(calls).to.deep.equal([]);
        expect(fs.readFileSync(victim, 'utf8')).to.equal('ORIGINAL');
      });
    }
  }

  for (const name of badNames) {
    it(`rejects directory entry ${JSON.stringify(name)}`, async function () {
      const { client, calls } = makeClient({
        '/remote': [dir(name)],
        [`/remote/${name}`]: [file('x.txt')],
      });
      const err = await client.downloadDir('/remote', dst).catch((e) => e);
      expect(err).to.be.instanceOf(Error);
      expect(err.code).to.equal(errorCode.badPath);
      expect(calls).to.deep.equal([]);
      expect(fs.readdirSync(root).toSorted()).to.deep.equal(['victim.txt']);
    });
  }

  it('rejects a bad name found in a nested subdirectory', async function () {
    const { client, calls } = makeClient({
      '/remote': [dir('good')],
      '/remote/good': [file('../../victim.txt')],
    });
    const err = await client.downloadDir('/remote', dst).catch((e) => e);
    expect(err.code).to.equal(errorCode.badPath);
    expect(calls).to.deep.equal([]);
    expect(fs.readFileSync(victim, 'utf8')).to.equal('ORIGINAL');
  });

  it('rejects the whole listing before downloading any file when one name is bad', async function () {
    const { client, calls } = makeClient({
      '/remote': [file('ok.txt'), file('../victim.txt')],
    });
    const err = await client.downloadDir('/remote', dst).catch((e) => e);
    expect(err.code).to.equal(errorCode.badPath);
    expect(calls).to.deep.equal([]);
  });

  it('still downloads legitimate names, including dots in names', async function () {
    const names = ['file.txt', '..hidden', 'a..b', '...', '.dotfile', 'with space', 'ünï.txt'];
    const { client, calls } = makeClient({
      '/remote': [...names.map((n) => file(n)), dir('sub')],
      '/remote/sub': [file('inner.txt')],
    });
    await client.downloadDir('/remote', dst);
    expect(calls.map((c) => c.dst).toSorted()).to.deep.equal(
      [...names.map((n) => path.join(dst, n)), path.join(dst, 'sub', 'inner.txt')].toSorted(),
    );
    expect(fs.readFileSync(victim, 'utf8')).to.equal('ORIGINAL');
  });
});

describe('32downloaddir isSafeEntryName', function () {
  it('accepts ordinary names', function () {
    for (const n of ['a', 'file.txt', '..hidden', 'a..b', '...', '.dot', 'x y', 'ünï']) {
      expect(isSafeEntryName(n), n).to.equal(true);
    }
  });

  it('rejects unsafe names and non-strings', function () {
    for (const n of ['', '.', '..', 'a/b', String.raw`a\b`, '/x', 'C:x', 'a\0b', null, undefined, 42]) {
      expect(isSafeEntryName(n), String(n)).to.equal(false);
    }
  });
});
