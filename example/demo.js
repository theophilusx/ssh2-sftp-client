'use strict';

let fs = require('fs');
let Client = require('../src/index.js');

let config = require('../tmp/ftp_config');
let sftp = new Client();

const BASIC_URL = '/sftp/edm/xucj/';

sftp.connect(config)
    // add test delete
    // .then(() => {
    //     return sftp.put('/Library/WebServer/Documents/nodejs/ssh2-sftp-client/test.html', BASIC_URL + 'bb/a1.html');
    // })
    // .then(() => {
    //     return sftp.mkdir(BASIC_URL + 'bb/aa', true);
    // })

    // .then((data) => sftp.list(BASIC_URL))
    // .then(() => {
    //     let str = '<body>string html</body>';
    //     let filePath = '/Library/WebServer/Documents/nodejs/ssh2-sftp-client/test.html';
    //     let buffer = new Buffer('this is the bufffffer test');
    //     let stream = fs.createReadStream(filePath);

    //     // test ok.
    //     // return sftp.put(filePath, BASIC_URL + 'hello1.html');
    //     // test ok.
    //     // sftp.put(buffer, BASIC_URL + 'hello3.html');
    //     // test ok.
    //     // sftp.put(stream, BASIC_URL + 'h5.html');
    // })

    // .then(() => {
    //     return sftp.get(BASIC_URL + 'hello1.html');
    // })

    // .then(() => {
    //     return sftp.mkdir(BASIC_URL + 'qq1/tt/a1.html', true);
    // })

    // .then(() => {
    //     return sftp.delete(BASIC_URL + 'hello1.html');
    // })

    // .then(() => {
    //     return sftp.rename(BASIC_URL + 'h5.html', BASIC_URL + 'bb/ooo.html');
    // })

    .then(() => {
        return sftp.rmdir(BASIC_URL + 'mocha-rmdir', true);
    })

    .then((data) => {
        console.log(data, 'end data');
    })
    .catch((err) => console.log(err, 'catch error'));
