## SSH2 SFTP Client
a SFTP client for node.js, a wrapper for [ssh2](https://github.com/mscdex/ssh2)

### Installation
```shell
npm install ssh2-sftp-client
```

### Usage
```javascript
let Client = require('ssh2-sftp-client');
let sftp = new Client();
sftp.connect({
    host: '127.0.0.1',
    port: '8080',
    username: 'username',
    password: '******'
}).then(() => {
    return sftp.list('/pathname');
}).then((data) => {
    console.log(data, 'the data info');
}).catch((err) => {
    console.log(err, 'catch error');
});
```

### Documentation
the connection to server config pls see [ssh2 client event](https://github.com/mscdex/ssh2#user-content-client-methods).

list of methods:
all the methods will return a Promise;
#### List
Retrieves a directory listing.

```javascript
sftp.list(remoteFilePath)
```

directory info:

```
type: // file type(-, d, l)
name: // file name
size: // file size
modifyTime: // file timestamp of modified time
accessTime: // file timestamp of access time
rights: {
    user:
    group:
    other:
},
owner: // user ID
group: // group ID
```

#### Get
get a new readable stream for path. The encoding is passed to Node Stream (https://nodejs.org/api/stream.html) and it controls how the content is encoded. For example, when downloading binary data, 'null' should be passed (check node stream documentation). Defaults to 'utf8'.

```javascript
sftp.get(remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
```

#### Put
upload a file. it can be `localPath` or `Buffer` or `Stream`.

```javascript
sftp.put(localFilePath, remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
sftp.put(Buffer, remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
sftp.put(Stream, remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
```

#### Mkdir
create a new directory.

```javascript
// recursive default is false, if true, it will create directory recursive
sftp.mkdir(remoteFilePath, recursive);
```

#### Rmdir
remove the directory or file.

```javascript
// recursive default is false, if true, it will remove directory recursive even if is not empty
sftp.rmdir(localPath, recursive);
```

#### Delete
delete file.

```javascript
sftp.delete(remoteFilePath);
```

#### Rename
rename remoteSourcePath to remoteDestPath (removes remoteSourcePath).

```javascript
sftp.rename(remoteSourcePath, remoteDestPath);
```

#### Chmod
modify rights to remoteDestPath file

```javascript
sftp.chmod(remoteDestPath, mode);
```

#### Connect
connection config you will see [here](https://github.com/mscdex/ssh2#user-content-client-methods)

#### End

Close the connection.

```javascript
sftp.end();
```

### FAQ

### Log
#### V1.1.0
    - fix: add encoding control support for binary stream

#### V1.0.5:

    - fix: multi image upload
    - change: remove `this.client.sftp` to `connect` function

