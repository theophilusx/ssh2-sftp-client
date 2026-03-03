const { Server } = require('ssh2');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const { getConnection, logger } = require('./hooks/global-hooks.js');
chai.use(chaiAsPromised);
chai.use(chaiSubset);

let server;
describe('27rstOnEnd: end() method tests', function () {
  let sftp;

  before('setup mock SSH server', function (done) {
    server = new Server({
      hostKeys: [`-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAEUC8mxihJM03nlm2KlueNMGf2EZ0R6pWrc28R/+OE3AAAAKBSF4SmUheE
pgAAAAtzc2gtZWQyNTUxOQAAACAEUC8mxihJM03nlm2KlueNMGf2EZ0R6pWrc28R/+OE3A
AAAED8hNH6eiXiiQX6An4mKKR0iOw1UyqWPoDszao6btWoewRQLybGKEkzTeeWbYqW540w
Z/YRnRHqlatzbxH/44TcAAAAFnJoeXN3aWxsaWFtc0BNYWMubG9jYWwBAgMEBQYH
-----END OPENSSH PRIVATE KEY-----`],
    }, (client) => {
      // Force the socket to use resetAndDestroy on end() to trigger ECONNRESET for testing
      const socket = client._sock;
      socket.end = function(...args) {
        if (socket.resetAndDestroy) {
          socket.resetAndDestroy();
        }
      };

      client.on('authentication', (ctx) => {
        ctx.accept();
      });

      client.on('ready', () => {
        client.on('session', (accept, reject) => {
          const session = accept();
          session.on('sftp', (accept, reject) => {
            const sftp = accept();
            sftp.on('REALPATH', (reqId, path) => {
              const resultPath = path === '.' ? '/' : path;
              sftp.name(reqId, [{ filename: resultPath }]);
            });
            sftp.on('STAT', (reqId, path) => {
              sftp.attrs(reqId, { mode: 0o755, size: 0, uid: 1000, gid: 1000 });
            });
          });
        });
      });
    });

    server.listen(2222, '0.0.0.0', () => {
      logger.debug('SFTP Mock Server started on port 2222');
      done();
    });
  })

  before('list() test setup hook', async function () {
    sftp = await getConnection({
      username: "mock",
      password: "mock",
      host: "localhost",
      port: 2222,
    });
    sftp.on("debug", (msg) => {console.log(msg);});
    return true;
  });

  it('end should not throw an exception on RST', async function () {
    await expect(sftp.end()).to.be.fulfilled;
  });

  after('destroy mock SSH server', function (done) {
    server.close(() => {
      logger.debug('SFTP Mock Server destroyed');
      done();
    })
  })
});
