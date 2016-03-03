'use strict';

let fs = require('fs');
let Client = require('../src/index.js');

let config = require('../tmp/ftp_config');
let sftp = new Client();

const BASIC_URL = '/sftp/edm/xucj/';

// he = sftp.sayHello();
sftp.connect(config)
    // add test delete
    // .then(() => {
    //     return sftp.put('/Library/WebServer/Documents/nodejs/ssh2-sftp-client/test.html', BASIC_URL + 'bb/a1.html');
    // })
    // .then(() => {
    //     return sftp.mkdir(BASIC_URL + 'bb/sub', true);
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
        // return sftp.rmdir(BASIC_URL + 'bb', true);
    })

    .then((data) => {
        console.log(data, 'end data');
    })
    .catch((err) => console.log(err, 'catch error'));


/**

    var sftp = SFTP();

    sftp.on('ready', function () {
        console.log('ready');
        sftp.mkdir('./test2', true, function (err, data) {
            console.log(err, data);

            sftp.end();
        });
    }).on('error', function (err) {
        console.log(err);
    }).connect({
        host : process.env.SFTP_HOST
        , user : process.env.SFTP_USER
        , password : process.env.SFTP_PASSWORD
    });


 // method1
 client.connect(config).list('/sftp', true, function(err, data) {
    // data is list message info
    console.log('doing success result');
 }).end();

 // method2
 client = client.connect(config);
 client.list('/path', true).then(function(){
    // do something..
    // return JSON
 });

 // method3
 p1 = new Promise();
 p1.then(() => {
    return client.isFileExist();
 }).then(() => {
    return client.list(path, true);
 }).then(() => {
    return client.mkdir(path, true);
 }).catch((err) => console.log(err));

 // ---
 client.connect()
        .then(client.list())
        .then(client.mkdir());
 // ---

 // method4
 client.connect(config)
        .isFileExist()
        .list(path, true)
        .mkdir(path)
        .then(() => {})
        .catch(() => {})

 */