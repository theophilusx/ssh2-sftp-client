'use strict';

const fs = require('fs');
const Client = require('../src/index.js');
const sftp = new Client();
const BASIC_URL = '/sftp-test/';

const config = {
    host: '127.0.0.1',
    port: '8080',
    username: 'username',
    password: '******'
};

// get connect
const connect = () => {
    sftp.connect(config);
};

// get list
const list = () => {
    sftp.connect(config).then(() => {
        return sftp.list(BASIC_URL);
    }).then((data) => {
        let body = data.on('data', (chunk) => {
            body += chunk;
        });

        data.on('end', () => {
            console.log(body)
            // close connection
            sftp.end()
        });
    })
};

// get file
const get = () => {
    sftp.connect(config).then(() => {
        return sftp.get(BASIC_URL + 'a.js');
    });
};

// put file
const put1 = () => {
    sftp.connect(config).then(() => {
        return sftp.put(BASIC_URL + 'localpath.js', BASIC_URL + 'remotepath.js');
    });
};
const put2 = () => {
    sftp.connect(config).then(() => {
        return sftp.put(new Buffer('hello'), BASIC_URL + 'file.js', true, 'utf-8');
    });
};

// mkdir
const mkdir = () => {
    sftp.connect(config).then(() => {
        return sftp.mkdir(BASIC_URL + 'change/log', true);
    });
};

// rmdir
const rmdir = () => {
    sftp.connect(config).then(() => {
        return sftp.rmdir(BASIC_URL + 'change/log', true);
    });
};

// delete
const deleteFile = () => {
    sftp.connect(config).then(() => {
        return sftp.delete(BASIC_URL + 'file.js');
    });
};

// rename
const rename = () => {
    sftp.connect(config).then(() => {
        return sftp.rename(BASIC_URL + 'source.js', BASIC_URL + 'remote.js');
    });
};

// trigger on event
sftp.connect(config);
sftp.on('end', () => {
    console.log('end event');
});
sftp.on('close', () => {
    console.log('close event');
});
