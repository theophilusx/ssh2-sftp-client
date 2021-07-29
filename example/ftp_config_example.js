var privateKey = require('fs').readFileSync('/.ssh/id_rsa', {'encoding':'utf8'});

module.exports = {
    host: '127.0.0.1',
    port: '8080',
    username: 'test',
    privateKey: privateKey
};