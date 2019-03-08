## SSH2 SFTP Client
a SFTP client for node.js, a wrapper for [ssh2](https://github.com/mscdex/ssh2)

Additional documentation on the methods and available options can be found in
the [ssh2](https://github.com/mscdex/ssh2) and
[ssh2-streams](https://github.com/mscdex/ssh2-streams) documentation.

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

### Breaking Changes

Due to some incompatibilities with stream handling which breaks this module when
used with Node 10.x, some changes have been implemented that should enhance the
interface, but which also break compatibility with previous versions. 

#### Option Changes

- The default encoding is null not utf8 as it was previously. This is consistent
  with the defaults for the underlying SSH2 module.
- The usedCompressed option has been removed. None of the shh2-steams methods
  actually support this option. The 'compress' option can be set as part of the
  connection options.  See [ssh2 client event](https://github.com/mscdex/ssh2#user-content-client-methods).
- The separate explicit option arguments for encoding and useCompression for some methods
  have been replaced with a single 'options' argument, which is an object that
  can have the following properties (defaults shown). See the
  [ssh2-streams](https://github.com/mscdex/ssh2-streams) documentation for an
  explination of the opt8ons. 
  
```javascript
    const defaults = {
    highWaterMark: 32 * 1024,
    debug: undefined,
    concurrency: 64,
    chunkSize: 32768,
    step: undefined,
    mode: 0o666,
    autoClose: true,
    encoding: null
  };
```

#### Method Changes

#### get(srcPath, dst, options)

Used to retrieve a file from a remote SFTP server. 

- srcPath: path to the file on the remote server
- dst: Either a string, which will be used as the path to store the file on the
  local system or a writable stream, which will be used as the destination for a
  stream pipe. If undefined, the remote file will be read into a Buffer and
  the buffer returned. 
- options: Options for the get operation e.g. encoding. 

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
Get a `ReadableStream` from remotePath. The encoding is passed to Node Stream (https://nodejs.org/api/stream.html) and it controls how the content is encoded. For example, when downloading binary data, 'null' should be passed (check node stream documentation). Default to 'null'.

```javascript
sftp.get(remoteFilePath, [options]);
```

#### FastGet
Downloads a file at remotePath to localPath using parallel reads for faster throughput. [options properties](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) you can find `fastGet` method here.

```javascript
sftp.fastGet(remotePath, localPath, [options]);
```

#### Put
upload a file from `localPath` or `Buffer`, `Stream` data to `remoteFilePath`.The encoding is passed to Node Stream to control how the content is encoded. Default to 'utf8'.

```javascript
sftp.put(localFilePath, remoteFilePath, [optons]);
sftp.put(Buffer, remoteFilePath, [options]);
sftp.put(Stream, remoteFilePath, [options]);
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
### V2.4.3
    - merge #108, #110
      - fix connect promise if connection ends

### V2.4.2
    - merge #105
      - fix windows path

### V2.4.1
    - merge pr #99, #100
      - bug fix

#### V2.4.0
Requires node.js v7.5.0 or above.

    - merge pr #97, thanks for @theophilusx
        - Remove emmitter.maxListener warnings
        - Upgraded ssh2 dependency from 0.5.5 to 0.6.1
        - Enhanced error messages to provide more context and to be more consistent
        - re-factored test
        - Added new 'exists' method and re-factored mkdir/rmdir

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

