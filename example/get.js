'use strict';

const fs = require('fs');
const path = require('path');
const Client = require('../src/index.js');
const sftp = new Client();
const BASIC_URL = path.resolve(__dirname, '../testServer/mocha-rmdir');

const config = {
    host: '172.29.84.8',
    username: 'jyu213',
    password: '**'
};

// get connect
const connect = () => {
    sftp.connect(config);
};


// get file
const get = () => {
    sftp.connect(config).then(() => {
        return sftp.get(BASIC_URL + '/file1.md');
    }).then((chunk) => {
        console.log(chunk)
    }).catch((err) => {
        console.log('catch err:', err)
    })
};

get()
// trigger on event
sftp.connect(config);
