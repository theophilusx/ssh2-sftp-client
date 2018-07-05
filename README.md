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
Get a Chunk from remotePath. The encoding is passed to Node Stream (https://nodejs.org/api/stream.html) and it controls how the content is encoded. For example, when downloading binary data, 'null' should be passed (check node stream documentation). Default to 'utf8'.

```javascript
sftp.get(remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
```

#### FastGet
Downloads a file at remotePath to localPath using parallel reads for faster throughput. [options properties](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) you can find `fastGet` method here.

```javascript
sftp.fastGet(remotePath, localPath, [options]);
```

#### Put
upload a file from `localPath` or `Buffer`, `Stream` data to `remoteFilePath`.The encoding is passed to Node Stream to control how the content is encoded. Default to 'utf8'.

```javascript
sftp.put(localFilePath, remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
sftp.put(Buffer, remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
sftp.put(Stream, remoteFilePath, [useCompression], [encoding], [addtionalOptions]);
```

#### FastPut
Uploads a file from localPath to remotePath using parallel reads for faster throughput. [options properties](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) you can find `fastPut` method here.

```javascript
sftp.fastPut(localPath, remotePath, [options]);
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
close the sftp connection. when you need it, you can call it in `then()` or `catch()`.

```
sftp.end();
```

### Event
add client event handle. you can find more [here](https://github.com/mscdex/ssh2#client-events)

#### close
The socket was closed. hadError is set to true if this was due to error.

```
sftp.on('close', callbackFn)
```

#### end
The socket was disconnected.

```
sftp.on('end', callbackFn)
```

#### error
An error occurred. A 'level' property indicates 'client-socket' for socket-level errors and 'client-ssh' for SSH disconnection messages. In the case of 'client-ssh' messages, there may be a 'description' property that provides more detail.

``` javascript
sftp.on('error', callbackFn)
```

### FAQ

### Log
#### V2.3.0
    - add: `stat` method
    - add `fastGet` and `fastPut` method.
    - fix: `mkdir` file exists decision logic

#### V3.0.0 -- deprecate this version
    - change: `sftp.get` will return chunk not stream anymore
    - fix: get readable not emitting data events in node 10.0.0

#### V2.1.1

    - add: event listener. [doc](https://github.com/jyu213/ssh2-sftp-client#Event)
    - add: `get` or `put` method add extra options [pr#52](https://github.com/jyu213/ssh2-sftp-client/pull/52)

#### V2.0.1

    - add: `chmod` method [pr#33](https://github.com/jyu213/ssh2-sftp-client/pull/33)
    - update: upgrade ssh2 to V0.5.0 [pr#30](https://github.com/jyu213/ssh2-sftp-client/pull/30)
    - fix: get method stream error reject unwork [#22](https://github.com/jyu213/ssh2-sftp-client/issues/22)
    - fix: return Error object on promise rejection [pr#20](https://github.com/jyu213/ssh2-sftp-client/pull/20)

#### V1.1.0

    - fix: add encoding control support for binary stream

#### V1.0.5:

    - fix: multi image upload
    - change: remove `this.client.sftp` to `connect` function

