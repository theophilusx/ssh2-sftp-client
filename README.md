## SSH2 SFTP Client
a SFTP client for node.js, a wrapper for [ssh2](https://github.com/mscdex/ssh2)

### Installation
`npm install ssh2-sftp-client`

### Usage
```
let Client = require('ssh2-sftp-client');
let sftp = new Client();
sftp.connect({
    host: '127.0.0.1',
    port: '8080',
    username: 'username'
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

```
sftp.list(romoteFilePath)
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
get a new readable stream for path.

```
sftp.get(romoteFilePath, [useCompression]);
```

#### Put
upload a file. it can be `localPath` or `Buffer` or `Stream`.

```
sftp.put(localFilePath, remoteFilePath, [useCompression]);
sftp.put(Buffer, remoteFilePath, [useCompression]);
sftp.put(Stream, remoteFilePath, [useCompression]);
```

#### Mkdir
create a new directory.

```
// recursive default is false, if true, it will create directory recursive
sftp.mkdir(remoteFilePath, recursive);
```

#### Rmdir
remove the directory or file.

```
// recursive default is false, if true, it will remove directory recursive even if is not empty
sftp.rmdir(localPath, recursive);
```

#### Delete
delete file.

```
sftp.delete(remoteFilePath);
```

#### Rename
rename/remove remoteSourcePath to remoteDestPath.

```
sftp.remove(remoteSourcePath, remoteDestPath);
```

#### Connect
connection config you will see [here](https://github.com/mscdex/ssh2#user-content-client-methods)

### FAQ

### Log
* 2016.05.19:
    - fix: multi image upload
    - change: remove `this.client.sftp` to `connect` function

