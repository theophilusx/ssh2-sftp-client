# Optional native crypto addon (`sshcrypto`) fails to compile on Node.js 26; silent fallback to pure JS is 5–13× slower

## Summary

On Node.js 26 the optional `sshcrypto` native addon cannot be built. The build fails with six
`'class v8::Context' has no member named 'GetIsolate'` errors in `lib/protocol/crypto/src/binding.cc`.

`install.js` catches the failure and `npm install` / `npm rebuild` still exit 0, so nothing tells the
user the addon is missing. ssh2 keeps working through its pure-JS crypto, but throughput in a
loopback benchmark is 5–13× lower than with the addon (table below).

A second layer sits underneath: with the `nan` version this lockfile resolved (2.25.0), `nan.h`
itself also fails against Node 26's V8. That part is fixed in newer `nan` releases. The `GetIsolate`
errors are not, because they are in ssh2's own source.

I verified that with `nan@2.30.0` plus a six-line change to `binding.cc`, the addon builds and
loads on Node 26 and the benchmark runs fast again (details below).

## Environment

| | |
|---|---|
| ssh2 | 1.17.0 (latest on npm at time of writing) |
| Node.js | v26.13.1 (V8 14.6.202.34-node.40) |
| npm / node-gyp | 12.2.0 / 13.0.0 |
| OS | Linux x86_64 (Fedora, kernel 7.3.3), gcc 16.2.1, Python 3.14.10 |
| `nan` resolved by the lockfile | 2.25.0 (`ssh2` allows `^2.23.0`) |
| Comparison | Node v24.22.3, same lockfile, same toolchain: addon builds and loads |

## Steps to reproduce

1. Use Node 26.13.1 and a project that depends on `ssh2@1.17.0` (`nan` is an optional dependency).
2. Run `npm rebuild ssh2 --foreground-scripts`.
3. The compile errors below are printed, followed by `Failed to build optional crypto binding`.
   The command exits 0 and `lib/protocol/crypto/build/Release/sshcrypto.node` does not exist.

On Node 24.22.3 with a clean `npm ci && npm rebuild` the same steps produce `sshcrypto.node`.

## What fails

The ssh2 errors (one per `Init()`; six in total, at `binding.cc` lines 89, 423, 664, 1061, 1489 and 1741):

```
../src/binding.cc: In static member function 'static void ChaChaPolyCipher::Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE)':
../src/binding.cc:89:37: error: 'class v8::Context' has no member named 'GetIsolate'
   89 |     v8::Isolate* isolate = context->GetIsolate();
      |                                     ^~~~~~~~~~
```

With `nan@2.25.0` there are also errors from `nan.h` / `nan_weak.h` (V8 now takes an extra tag argument):

```
nan/nan.h:822:54: error: no matching function for call to 'v8::Object::GetAlignedPointerFromInternalField(int&)'
nan/nan.h:829:45: error: no matching function for call to 'v8::Object::SetAlignedPointerInInternalField(int&, void*&)'
  candidate 1: 'void* v8::Object::GetAlignedPointerFromInternalField(int, v8::EmbedderDataTypeTag)'
```

Those `nan` errors are already addressed upstream in `nan` (see "Related reports" below), and
disappear with `nan@2.30.0`. I re-ran the build in a clean directory with `nan@2.30.0`: the
`GetAlignedPointer…` errors are gone and exactly the six `GetIsolate` errors remain.

### Cause of the `GetIsolate` errors

The Node 24.22.3 headers declare `Isolate* GetIsolate();` on `v8::Context` (`v8-context.h:259`).
The Node 26.13.1 `v8-context.h` has no `GetIsolate` on `Context`. `binding.cc` calls it in each
class's `Init()`, in the form:

```cpp
Local<Context> context = Nan::GetCurrentContext();
v8::Isolate* isolate = context->GetIsolate();
```

## Impact

Functionality is unaffected (the JS fallback works). Throughput is much lower, and users get no
error or warning to explain it.

Benchmark: an ssh2 `Server` and `Client` in one process over `127.0.0.1`. The server streams 64 MiB
over a session channel (`exec`), with the cipher pinned on both ends. Three runs per cipher; median
shown. The script is in the appendix.

| Cipher | Node 24.22.3, addon built | Node 26.13.1, no addon (current behaviour) | Slowdown | Node 26.13.1, addon built with the fix below |
|---|---|---|---|---|
| `aes128-gcm@openssh.com` | 476.4 MiB/s | 37.6 MiB/s | 12.7× | 705.2 MiB/s |
| `aes128-ctr` | 148.0 MiB/s | 29.6 MiB/s | 5.0× | 189.4 MiB/s |
| `chacha20-poly1305@openssh.com` | 398.8 MiB/s | 32.4 MiB/s | 12.3× | 444.6 MiB/s |

Run-to-run spread is visible (for example the GCM runs on Node 24 were 395.0, 476.4 and 559.5), so read
the table as order of magnitude, not exact ratios.

Real-world observation: a downstream SFTP client's test suite (286 tests with large-file and bulk
directory transfers against one SFTP server) took about 1 minute on Node 22 and 24 and about
18 minutes on Node 26. This is wall-clock time that includes network and server time, so it is
not a controlled measurement. It is consistent with the benchmark above.

## Verified workaround / suggested fix

In a clean directory (Node 26.13.1):

1. `npm install ssh2@1.17.0 nan@2.30.0` — still fails, with only the six `GetIsolate` errors.
2. In `node_modules/ssh2/lib/protocol/crypto/src/binding.cc`, replace the six occurrences of
   `context->GetIsolate()` with `v8::Isolate::GetCurrent()`.
3. `npm rebuild ssh2 --foreground-scripts` — builds with 0 errors; `sshcrypto.node` is created and
   `require()`s fine on Node 26.13.1.
4. The benchmark then ran at the speeds in the last table column, and every run received the full
   64 MiB.

Suggested changes for ssh2:

- Replace `context->GetIsolate()` in `binding.cc` (for example with `v8::Isolate::GetCurrent()`,
  which is what I tested; you may prefer another approach).
- Raise the minimum `nan` in `optionalDependencies` to a release that supports Node 26.
  I did not bisect which release is the first. 2.25.0 fails and 2.30.0 works.
- Make a failed addon build visible, for example a warning at install time that states the
  cost, or a documented way to check at runtime whether the addon loaded. Today the only
  trace is the `Failed to build optional crypto binding` message, which appears only if the
  user runs the script in the foreground.

## Related reports

I searched `mscdex/ssh2` through the GitHub search API on 2026-11-15. **I found no existing issue
for this Node 26 build failure.** Queries returned zero hits for `GetIsolate` (titles, bodies and
comments), `"Failed to build optional crypto binding"` was only found in old, closed install reports
(#1015, #1074, #1147, #1407 and similar), and `"Node 26"` / `"Node.js 26"` / `v8::Context` found nothing about the
addon build. Some result pages were truncated when I fetched them, and GitHub's search is lexical,
so this is not proof that no report exists. Please search before filing.

Possibly related (not duplicates):

- mscdex/ssh2 #1511 (closed): the addon aborts the process at runtime on Node 24.19.0 because of a
  `RemoveEnvironmentCleanupHook` assertion in the `ObjectWrap` destructor. A different failure
  in the same addon, but it also shows the addon breaking with newer Node headers. It suggests
  moving to `Nan::ObjectWrap`, which may be worth considering together with this.
- nodejs/nan #1009 / PRs #1010 and #1013 (merged, March 2026): `EmbedderDataTypeTag` changes for
  V8 14, which fix the `nan.h` errors above.
- nodejs/nan #1016 and #1017 (merged/closed, May 2026): "Support Node.js v26".

## Caveats

- The benchmark is a single machine, one process for both ends of the connection (so both
  encrypt and decrypt use the code path under test), 64 MiB per run, three runs. It measures
  crypto-heavy channel throughput, not SFTP specifically.
- I only smoke-tested the patched addon: it builds, loads, and the benchmark transferred all
  bytes for the three ciphers. I did not run ssh2's own test suite against it, and I did not check
  the data contents or test Node 24 with the patched source.
- I did not test other platforms or compilers, nor Node 25 or any other 26.x release.

## Appendix: benchmark script

Run with `node ssh2-bench.cjs <path-to-ssh2-package-dir>`, for example `node ssh2-bench.cjs node_modules/ssh2`.

```js
// Loopback throughput benchmark for ssh2: server streams N MiB to a client over
// a session channel. Everything stays in one process on 127.0.0.1.
const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPairSync } = require('node:crypto');

const ssh2Dir = path.resolve(process.argv[2]);
const { Client, Server } = require(ssh2Dir);
const bindingPath = path.join(ssh2Dir, 'lib/protocol/crypto/build/Release/sshcrypto.node');
const hasBinding = fs.existsSync(bindingPath);

const MIB = 1024 * 1024;
const TOTAL = 64 * MIB;
const RUNS = 3;
const CIPHERS = ['aes128-gcm@openssh.com', 'aes128-ctr', 'chacha20-poly1305@openssh.com'];

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const hostKey = privateKey.export({ type: 'pkcs1', format: 'pem' });

function once(cipher) {
  return new Promise((resolve, reject) => {
    const algorithms = { cipher: [cipher] };
    const server = new Server({ hostKeys: [hostKey], algorithms }, (client) => {
      client.on('authentication', (ctx) => ctx.accept());
      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();
          session.on('exec', (acceptExec) => {
            const stream = acceptExec();
            const chunk = Buffer.alloc(32 * 1024, 0x61);
            let sent = 0;
            const pump = () => {
              while (sent < TOTAL) {
                sent += chunk.length;
                if (!stream.write(chunk)) {
                  stream.once('drain', pump);
                  return;
                }
              }
              stream.exit(0);
              stream.end();
            };
            pump();
          });
        });
      });
      client.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const conn = new Client();
      conn.on('error', reject);
      conn.on('ready', () => {
        let got = 0;
        const t0 = process.hrtime.bigint();
        conn.exec('data', (err, stream) => {
          if (err) return reject(err);
          stream.on('data', (d) => {
            got += d.length;
          });
          stream.on('close', () => {
            const secs = Number(process.hrtime.bigint() - t0) / 1e9;
            conn.end();
            server.close();
            if (got !== TOTAL) return reject(new Error(`short transfer: ${got}`));
            resolve(TOTAL / MIB / secs);
          });
        });
      });
      conn.connect({
        host: '127.0.0.1',
        port,
        username: 'u',
        password: 'p',
        algorithms,
        hostVerifier: () => true,
      });
    });
  });
}

(async () => {
  console.log(`node ${process.version}  ssh2 native binding present: ${hasBinding}`);
  for (const cipher of CIPHERS) {
    const rates = [];
    for (let i = 0; i < RUNS; i++) rates.push(await once(cipher));
    rates.sort((a, b) => a - b);
    console.log(
      `${cipher.padEnd(32)} median ${rates[1].toFixed(1)} MiB/s  (runs: ${rates
        .map((r) => r.toFixed(1))
        .join(', ')})`,
    );
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
```
