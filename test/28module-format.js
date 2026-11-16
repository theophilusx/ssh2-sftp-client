import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chai from 'chai';

const expect = chai.expect;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(script, esm) {
  const args = esm ? ['--input-type=module', '-e', script] : ['-e', script];
  return execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8' }).trim();
}

describe('Module format', function () {
  it('loads via import with SftpClient as default export', function () {
    const out = run(
      "import('./src/index.js').then(m => console.log(typeof m.default, m.default.name))",
      false
    );
    expect(out).to.equal('function SftpClient');
  });

  it('loads via require() returning the class itself', function () {
    const out = run("const C = require('ssh2-sftp-client'); console.log(typeof C, C.name)", false);
    expect(out).to.equal('function SftpClient');
  });

  it('exposes a version that matches package.json', function () {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const out = run(
      "import C from 'ssh2-sftp-client'; console.log(new C().version)",
      true
    );
    expect(out).to.equal(pkg.version);
  });

  it('resolves the package name through the exports map', function () {
    const out = run(
      "import C from 'ssh2-sftp-client'; console.log(typeof C, C.name)",
      true
    );
    expect(out).to.equal('function SftpClient');
  });
});
