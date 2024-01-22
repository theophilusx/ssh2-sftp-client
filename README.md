- [Overview](#org0e4d5b3)
  - [Version 10.0.0 Changes](#org369dfd1)
- [Installation](#orgd0fe277)
- [Basic Usage](#orgbafe4eb)
- [Documentation](#org0d80a20)
  - [Specifying Paths](#org3400112)
  - [Methods](#orgb084eab)
    - [new SftpClient(name) ===> SFTP client object](#org665f5cf)
    - [connect(config) ===> SFTP object](#org89ab3df)
    - [list(path, filter) ==> Array[object]](#org4eb0ff0)
    - [exists(path) ==> boolean](#org1fb6bb1)
    - [stat(path) ==> object](#org573fb75)
    - [get(path, dst, options) ==> String|Stream|Buffer](#orgdb7b4d5)
    - [fastGet(remotePath, localPath, options) ===> string](#orgec657e5)
    - [put(src, remotePath, options) ==> string](#org8c3cbdf)
    - [fastPut(localPath, remotePath, options) ==> string](#org4f9e43f)
    - [append(input, remotePath, options) ==> string](#orgb20ed55)
    - [mkdir(path, recursive) ==> string](#org76bdc11)
    - [rmdir(path, recursive) ==> string](#orgb0d8b83)
    - [delete(path, noErrorOK) ==> string](#org3c2897b)
    - [rename(fromPath, toPath) ==> string](#org45e0ed0)
    - [posixRename(fromPath, toPath) ==> string](#org68239f4)
    - [chmod(path, mode) ==> string](#org7e61dd3)
    - [realPath(path) ===> string](#org0c79ede)
    - [cwd() ==> string](#org74c2a96)
    - [uploadDir(srcDir, dstDir, options) ==> string](#org7774805)
    - [downloadDir(srcDir, dstDir, options) ==> string](#orgf1a595e)
    - [createReadStream(remotePath, options)) ==> stream object](#orgc23b9ed)
    - [createWriteStream(remotePath, options) ==> stream object](#org6573ba0)
    - [rcopy(srcPath, dstPath) ==> string](#org1b3d33d)
    - [end() ==> boolean](#org722a5ee)
    - [Add and Remove Listeners](#orgd71b7fe)
- [Platform Quirks & Warnings](#org3d8177e)
  - [Server Capabilities](#orgf5c55fe)
  - [Issues with `fastPut()` and `fastGet()` Methods](#org02bf649)
  - [Promises, Events & Managing Exceptions](#org620202c)
    - [Adding Custom Handlers](#org4f7acfa)
  - [Windows Based Servers](#org3c27736)
  - [Don't Re-use SftpClient Objects](#orga7c9b2c)
- [FAQ](#org24783d4)
  - [Remote server drops connections with only an end event](#orga3db9c4)
  - [How can I pass writeable stream as dst for get method?](#org1eb66a8)
  - [How can I upload files without having to specify a password?](#org7de7f96)
  - [How can I connect through a Socks Proxy](#orgc09e933)
  - [Timeout while waiting for handshake or handshake errors](#org386db71)
  - [How can I limit upload/download speed](#orgf688502)
  - [Connection hangs or fails for larger files](#orgf779489)
  - [Typescript definition file out of date](#org85e6656)
- [Examples](#org5de1977)
- [Troubleshooting](#org7956476)
  - [Common Errors](#orgd59440f)
    - [Not returning the promise in a `then()` block](#org230c2d7)
    - [Mixing Promise Chains and Async/Await](#org83e36d2)
    - [Try/catch and Error Handlers](#org0175a34)
    - [Server Differences](#org5931953)
    - [Avoid Concurrent Operations](#org1ba6229)
  - [Debugging Support](#org83d2a4a)
- [Logging Issues](#orge6f0d8a)
- [Pull Requests](#orgb3bfc09)
- [Contributors](#org7870be2)



<a id="org0e4d5b3"></a>

# Overview

an SFTP client for node.js, a wrapper around [SSH2](https://github.com/mscdex/ssh2) which provides a high level convenience abstraction as well as a Promise based API.

Documentation on the methods and available options in the underlying modules can be found on the [SSH2](https://github.com/mscdex/ssh2) project pages. As this module is really just a wrapper around the `ssh2` module, you will find lots of useful information, tips and examples in the `ssh2` repository.

Current stable release is \*v10.0.0.

Code has been tested against Node versions 16.20.2, 18.18.2, 20.10.0 and 21.5.0. However, only versions from v18 are actively supported. It should also be noted that a significant performance improvement has been observed with versions >= 18. Version v16 is significantly slower.

Node versions < 16.x are not supported.

If you find this module useful and you would like to support the on-going maintenance and support of users, please consider making a small [donation](https://square.link/u/gB2kSdkY?src=embed).


<a id="org369dfd1"></a>

## Version 10.0.0 Changes

-   The main change in this version is adding of limits on the number of promises which can be active at the same time. Version 9.1.0 extended the use of multiple promises to improve performance with downloadDir() and uploadDir(). However, for directories with really large numbers of files, this often resulted in an error because the methods would try to create more concurrent promises than was possible given available resources. This issue has been fixed by adding a new property called `promiseLimit`, which is limited to 10 by default. A new configuration property, `promiseLimit`, is now available for setting the maximum number of concurrent promises the downloadDir()/uploadDir() methods will create when downloading or uploading directory trees.
    -   Various minor documentation fixes and some minor fixes for typos in option property names.


<a id="orgd0fe277"></a>

# Installation

```shell
npm install ssh2-sftp-client
```


<a id="orgbafe4eb"></a>

# Basic Usage

```js
let Client = require('ssh2-sftp-client');
let sftp = new Client();

sftp.connect({
  host: '127.0.0.1',
  port: '8080',
  username: 'username',
  password: '******'
}).then(() => {
  return sftp.list('/pathname');
}).then(data => {
  console.log(data, 'the data info');
}).catch(err => {
  console.log(err, 'catch error');
});
```


<a id="org0d80a20"></a>

# Documentation

The connection options are the same as those offered by the underlying SSH2 module, with just a couple of additional properties added to tweak the `retry` parameters, add a `debug` function and set the `promiseLimit` property. For full details on the other properties, please see [SSH2 client methods](https://github.com/mscdex/ssh2#user-content-client-methods). In particular, see the `ssh2` documentation for details relating to setting various key exchange and encryption/signing algorithms used as part of the ssh2 protocol.

All the methods will return a Promise, except for `on(), ~removeListener()`, `createReadStream` and `createWriteStream`, which are typically only used in special use cases.

Note that I don't use Typescript and I don't maintain any typescript definition files. There are some typescript type definition files for this module, but they are maintained separately and have nothing to do with this project. Therefore, please do not log any issues arising from the use of these definition files with this project. Instead, refer your issues to the maintainers of those modules.


<a id="org3400112"></a>

## Specifying Paths

The convention with both FTP and SFTP is that paths are specified using a 'nix' style i.e. use `/` as the path separator. This means that even if your SFTP server is running on a win32 platform, you should use `/` instead of `\` as the path separator. For example, for a win32 path of `C:\Users\fred` you would actually use `/C:/Users/fred`. If your win32 server does not support the 'nix' path convention, you can try setting the `remotePathSep` property of the `SftpClient` object to the path separator of your remote server. This **might** work, but has not been tested. Please let me know if you need to do this and provide details of the SFTP server so that I can try to create an appropriate environment and adjust things as necessary. At this point, I'm not aware of any win32 based SFTP servers which do not support the 'nix' path convention.

All remote paths must either be absolute e.g. `/absolute/path/to/file` or they can be relative with a prefix of either `./` (relative to current remote directory) or `../` (relative to parent of current remote directory) e.g. `./relative/path/to/file` or `../relative/to/parent/file`. It is also possible to do things like `../../../file` to specify the parent of the parent of the parent of the current remote directory. The shell tilde (`~`) and common environment variables like `$HOME` are NOT supported.

It is important to recognise that the current remote directory may not always be what you may expect. A lot will depend on the remote platform of the SFTP server and how the SFTP server has been configured. When things don't seem to be working as expected, it is often a good idea to verify your assumptions regarding the remote directory and remote paths. One way to do this is to login using a command line program like `sftp` or `lftp`.

There is a small performance hit for using `./` and `../` as the module must query the remote server to determine what the root path is and derive the absolute path. Using absolute paths are therefore more efficient and likely more robust.

When specifying file paths, ensure to include a full path i.e. include the remote file name. Don't expect the module to append the local file name to the path you provide. For example, the following will not work

```javascript
client.put('/home/fred/test.txt', '/remote/dir');
```

will not result in the file `test.txt` being copied to `/remote/dir/test.txt`. You need to specify the target file name as well e.g.

```javascript
client.put('/home/fred/test.txt', '/remote/dir/test.txt');
```

Note that the remote file name does not have to be the same as the local file name. The following works fine;

```javascript
client.put('/home/fred/test.txt', '/remote/dir/test-copy.txt');
```

This will copy the local file `test.txt` to the remote file `test-copy.txt` in the directory `/remote/dir`.


<a id="orgb084eab"></a>

## Methods


<a id="org665f5cf"></a>

### new SftpClient(name) ===> SFTP client object

Constructor to create a new `ssh2-sftp-client` object. An optional `name` string can be provided, which will be used in error messages to help identify which client has thrown the error.

1.  Constructor Arguments

    -   **name:** string. An optional name string used in error messages

2.  Example Use

    ```javascript
    'use strict';
    
    const Client = require('ssh2-sftp-client');
    
    const config = {
      host: 'example.com',
      username: 'donald',
      password: 'my-secret'
    };
    
    const sftp = new Client('example-client');
    
    sftp.connect(config)
      .then(() => {
        return sftp.cwd();
      })
      .then(p => {
        console.log(`Remote working directory is ${p}`);
        return sftp.end();
      })
      .catch(err => {
        console.log(`Error: ${err.message}`); // error message will include 'example-client'
      });
    ```


<a id="org89ab3df"></a>

### connect(config) ===> SFTP object

Connect to an sftp server. Full documentation for connection options is available [here](https://github.com/mscdex/ssh2#user-content-client-methods)

1.  Connection Options

    This module is based on the excellent [SSH2](https://github.com/mscdex/ssh2#client) module. That module is a general SSH2 client and server library and provides much more functionality than just SFTP connectivity. Many of the connect options provided by that module are less relevant for SFTP connections. It is recommended you keep the config options to the minimum needed and stick to the options listed in the `commonOpts` below.
    
    The `retries`, `retry_factor` and `retry_minTimeout` options are not part of the SSH2 module. These are part of the configuration for the [retry](https://www.npmjs.com/package/retry) package and what is used to enable retrying of sftp connection attempts. See the documentation for that package for an explanation of these values.
    
    The `promiseLimit` is another option which is not part of the `ssh2` module and is specific to `ssh2-sftp-client`. It is a property used to limit the maximum number of concurrent promises possible when either downloading or uploading a directory tree using the `downloadDir()` or `uploadDir()` methods. The default setting for this property is 10. **NOTE**: bigger doe snot mean better. Many factors can affect what is the ideal setting for `promiseLimit`. If it is too large, any benefits are lost while node spends time switching contexts and/or withi the overheads associated with creating and cleaning up promises. Lots of factors can affect what the setting should be, including size of files, number of files, speed of network, version of node, capabilities of remote sftp server etc. A setting of 10 seems to be a reasonably good default and should be adequate for most use cases. However, if you feel it needs to be changed, I highly recommend that you benchmark different values to work out what is the best maximum size before you begin to see a performance drop off.
    
    ```javascript
    // common options
    
    let commonOpts {
      host: 'localhost', // string Hostname or IP of server.
      port: 22, // Port number of the server.
      forceIPv4: false, // boolean (optional) Only connect via IPv4 address
      forceIPv6: false, // boolean (optional) Only connect via IPv6 address
      username: 'donald', // string Username for authentication.
      password: 'borsch', // string Password for password-based user authentication
      agent: process.env.SSH_AGENT, // string - Path to ssh-agent's UNIX socket
      privateKey: fs.readFileSync('/path/to/key'), // Buffer or string that contains
      passphrase: 'a pass phrase', // string - For an encrypted private key
      readyTimeout: 20000, // integer How long (in ms) to wait for the SSH handshake
      strictVendor: true, // boolean - Performs a strict server vendor check
      debug: myDebug,// function - Set this to a function that receives a single
                    // string argument to get detailed (local) debug information.
      retries: 2, // integer. Number of times to retry connecting
      retry_factor: 2, // integer. Time factor used to calculate time between retries
      retry_minTimeout: 2000, // integer. Minimum timeout between attempts
      promiseLimit: 10, // max concurrent promises for downloadDir/uploadDir
    };
    
    // rarely used options
    
    let advancedOpts {
      localAddress,
      localPort,
      hostHash,
      hostVerifier,
      agentForward,
      localHostname,
      localUsername,
      tryKeyboard,
      authHandler,
      keepaliveInterval,
      keepaliveCountMax,
      sock,
      algorithms,
      compress
    };
    ```

2.  Example Use

    ```javascript
    sftp.connect({
      host: 'example.com',
      port: 22,
      username: 'donald',
      password: 'youarefired'
    });
    ```


<a id="org4eb0ff0"></a>

### list(path, filter) ==> Array[object]

Retrieves a directory listing. This method returns a Promise, which once realised, returns an array of objects representing items in the remote directory.

-   **path:** {String} Remote directory path
-   **filter:** (optional) {function} A function used to filter the items included in the returned array. The function is called for each item with the item object being passed in as the argument. The function is passed to Array.filter() to perform the filtering.

1.  Example Use

    ```javascript
    const Client = require('ssh2-sftp-client');
    
    const config = {
      host: 'example.com',
      port: 22,
      username: 'red-don',
      password: 'my-secret'
    };
    
    let sftp = new Client();
    
    sftp.connect(config)
      .then(() => {
        return sftp.list('/path/to/remote/dir');
      })
      .then(data => {
        console.log(data);
      })
      .then(() => {
        sftp.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```

2.  Return Objects

    The objects in the array returned by `list()` have the following properties;
    
    ```javascript
    {
      type: '-', // file type(-, d, l)
      name: 'example.txt', // file name
      size: 43, // file size
      modifyTime: 1675645360000, // file timestamp of modified time
      accessTime: 1675645360000, // file timestamp of access time
      rights: {
        user: 'rw',
        group: 'r',
        other: 'r',
      },
      owner: 1000, // user ID
      group: 1000, // group ID
      longname: '-rw-r--r--  1 fred  fred  43 Feb 6 12:02 exaple.txt', // like ls -l line
    }
    ```


<a id="org1fb6bb1"></a>

### exists(path) ==> boolean

Tests to see if remote file or directory exists. Returns type of remote object if it exists or false if it does not.

1.  Example Use

    ```javascript
    const Client = require('ssh2-sftp-client');
    
    const config = {
      host: 'example.com',
      port: 22,
      username: 'red-don',
      password: 'my-secret'
    };
    
    let sftp = new Client();
    
    sftp.connect(config)
      .then(() => {
        return sftp.exists('/path/to/remote/dir');
      })
      .then(data => {
        console.log(data);          // will be false or d, -, l (dir, file or link)
      })
      .then(() => {
        sftp.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org573fb75"></a>

### stat(path) ==> object

Returns the attributes associated with the object pointed to by `path`.

-   **path:** String. Remote path to directory or file on remote server

1.  Attributes

    The `stat()` method returns an object with the following properties;
    
    ```javascript
    let stats = {
      mode: 33279, // integer representing type and permissions
      uid: 1000, // user ID
      gid: 985, // group ID
      size: 5, // file size
      accessTime: 1566868566000, // Last access time. milliseconds
      modifyTime: 1566868566000, // last modify time. milliseconds
      isDirectory: false, // true if object is a directory
      isFile: true, // true if object is a file
      isBlockDevice: false, // true if object is a block device
      isCharacterDevice: false, // true if object is a character device
      isSymbolicLink: false, // true if object is a symbolic link
      isFIFO: false, // true if object is a FIFO
      isSocket: false // true if object is a socket
    };
    ```

2.  Example Use

    ```javascript
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.stat('/path/to/remote/file');
      })
      .then(data => {
        // do something with data
      })
      .then(() => {
        client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="orgdb7b4d5"></a>

### get(path, dst, options) ==> String|Stream|Buffer

Retrieve a file from a remote SFTP server. The `dst` argument defines the destination and can be either a string, a stream object or undefined. If it is a string, it is interpreted as the path to a location on the local file system (path should include the file name). If it is a stream object, the remote data is passed to it via a call to pipe(). If `dst` is undefined, the method will put the data into a buffer and return that buffer when the Promise is resolved. If `dst` is defined, it is returned when the Promise is resolved.

In general, if you're going to pass in a string as the destination, you are better off using the `fastGet()` method.

-   **path:** String. Path to the remote file to download
-   **dst:** String|Stream. Destination for the data. If a string, it should be a local file path.
-   **options:** Options for the `get()` command (see below).

1.  Options

    The `options` argument can be used to pass options to the underlying streams and pipe call used by this method. The argument is an object with three possible properties, `readStreamOptions`, `writeStreamOptions` and `pipeOptions`. The values for each of these properties should be an object containing the required options. For example, possible read stream and pipe options could be defined as
    
    ```javascript
    let options = {
      readStreamOptions: {
        flags: 'r',
        encoding: null,
        handle: null,
        mode: 0o666,
        autoClose: true
      },
      pipeOptions: {
        end: false
      }};
    
    ```
    
    Most of the time, you won't want to use any options. Sometimes, it may be useful to set the encoding. For example, to 'utf-8'. However, it is important not to do this for binary files to avoid data corruption.

2.  Example Use

    ```javascript
    let client = new Client();
    
    let remotePath = '/remote/server/path/file.txt';
    let dst = fs.createWriteStream('/local/file/path/copy.txt');
    
    client.connect(config)
      .then(() => {
        return client.get(remotePath, dst);
      })
      .then(() => {
        client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```
    
    -   **Tip:** See examples file in the Git repository for more examples. You can pass any writeable stream in as the destination. For example, if you pass in `zlib.createGunzip()` writeable stream, you can both download and decompress a gzip file 'on the fly'.


<a id="orgec657e5"></a>

### fastGet(remotePath, localPath, options) ===> string

Downloads a file at remotePath to localPath using parallel reads for faster throughput. This is the simplest method if you just want to download a file. However, fastGet functionality depends heavily on remote sftp server capabilities and not all servers have the concurrency support required. See the Platform Quirks & Warnings section of this README.

Bottom line, when it works, it tends to work reliably. However, for many servers, it simply won't work or will result in truncated/corrupted data.

-   **remotePath:** String. Path to the remote file to download
-   **localPath:** String. Path on local file system for the downloaded file. The local path should include the filename to use for saving the file.
-   **options:** Options for `fastGet()` (see below)

1.  Options

    ```javascript
    {
      concurrency: 64, // integer. Number of concurrent reads to use
      chunkSize: 32768, // integer. Size of each read in bytes
      step: function(total_transferred, chunk, total) // callback called each time a
                                                      // chunk is transferred
    }
    ```
    
    -   **Warning:** Some servers do not respond correctly to requests to alter chunk size. This can result in lost or corrupted data.

2.  Sample Use

    ```javascript
    let client = new Client();
    let remotePath = '/server/path/file.txt';
    let localPath = '/local/path/file.txt';
    
    client.connect(config)
      .then(() => {
        client.fastGet(remotePath, localPath);
      })
      .then(() => {
        client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org8c3cbdf"></a>

### put(src, remotePath, options) ==> string

Upload data from local system to remote server. If the `src` argument is a string, it is interpreted as a local file path to be used for the data to transfer. If the `src` argument is a buffer, the contents of the buffer are copied to the remote file and if it is a readable stream, the contents of that stream are piped to the `remotePath` on the server.

-   **src:** string | buffer | readable stream. Data source for data to copy to the remote server.
-   **remotePath:** string. Path to the remote file to be created on the server.
-   **options:** object. Options which can be passed to adjust the read and write stream used in sending the data to the remote server or the pipe call used to make the data transfer (see below).

1.  Options

    The options object supports three properties, `readStreamOptions`, `writeStreamOptions` and `pipeOptions`. The value for each property should be an object with options as properties and their associated values representing the option value. For example, you might use the following to set `writeStream` options.
    
    ```javascript
    {
      writeStreamOptions: {
        flags: 'w',  // w - write and a - append
        encoding: null, // use null for binary files
        mode: 0o666, // mode to use for created file (rwx)
    }}
    ```
    
    The most common options to use are mode and encoding. The values shown above are the defaults. You do not have to set encoding to utf-8 for text files, null is fine for all file types. However, using utf-8 encoding for binary files will often result in data corruption.
    
    Note that you cannot set `autoClose: false` for `writeStreamOptions`. If you attempt to set this property to false, it will be ignored. This is necessary to avoid a race condition which may exist when setting `autoClose` to false on the writeStream. As there is no easy way to access the writeStream once the promise has been resolved, setting this to autoClose false is not terribly useful as there is no easy way to manually close the stream after the promise has been resolved.

2.  Example Use

    ```javascript
    let client = new Client();
    
    let data = fs.createReadStream('/path/to/local/file.txt');
    let remote = '/path/to/remote/file.txt';
    
    client.connect(config)
      .then(() => {
        return client.put(data, remote);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```
    
    -   **Tip:** If the src argument is a path string, consider just using `fastPut()`.


<a id="org4f9e43f"></a>

### fastPut(localPath, remotePath, options) ==> string

Uploads the data in file at `localPath` to a new file on remote server at `remotePath` using concurrency. The options object allows tweaking of the fast put process. Note that this functionality is heavily dependent on the capabilities of the remote sftp server, which must support the concurrency operations used by this method. This is not part of the standard and therefore is not available in all sftp servers. See the Platform Quirks & Warnings for more details.

Bottom line, when it works, it tends to work well. However, when it doesn't work, it may fail completely or it may result in truncated or corrupted data transfers.

-   **localPath:** string. Path to local file to upload
-   **remotePath:** string. Path to remote file to create
-   **options:** object. Options passed to createWriteStream (see below)

1.  Options

    ```javascript
    {
      concurrency: 64, // integer. Number of concurrent reads
      chunkSize: 32768, // integer. Size of each read in bytes
      mode: 0o755, // mixed. Integer or string representing the file mode to set
      step: function(total_transferred, chunk, total) // function. Called every time
      // a part of a file was transferred
    }
    ```
    
    -   **Warning:** There have been reports that some SFTP servers will not honour requests for non-default chunk sizes. This can result in data loss or corruption.

2.  Example Use

    ```javascript
    let localFile = '/path/to/file.txt';
    let remoteFile = '/path/to/remote/file.txt';
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        client.fastPut(localFile, remoteFile);
      })
      .then(() => {
        client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="orgb20ed55"></a>

### append(input, remotePath, options) ==> string

Append the `input` data to an existing remote file. There is no integrity checking performed apart from normal writeStream checks. This function simply opens a writeStream on the remote file in append mode and writes the data passed in to the file.

-   **input:** buffer | readStream. Data to append to remote file
-   **remotePath:** string. Path to remote file
-   **options:** object. Options to pass to writeStream (see below)

1.  Options

    The following options are supported;
    
    ```javascript
    {
      flags: 'a',  // w - write and a - append
      encoding: null, // use null for binary files
      mode: 0o666, // mode to use for created file (rwx)
      autoClose: true // automatically close the write stream when finished
    }
    ```
    
    The most common options to use are mode and encoding. The values shown above are the defaults. You do not have to set encoding to utf-8 for text files, null is fine for all file types. Generally, I would not attempt to append binary files.

2.  Example Use

    ```javascript
    let remotePath = '/path/to/remote/file.txt';
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.append(Buffer.from('Hello world'), remotePath);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org76bdc11"></a>

### mkdir(path, recursive) ==> string

Create a new directory. If the recursive flag is set to true, the method will create any directories in the path which do not already exist. Recursive flag defaults to false.

-   **path:** string. Path to remote directory to create
-   **recursive:** boolean. If true, create any missing directories in the path as well

1.  Example Use

    ```javascript
    let remoteDir = '/path/to/new/dir';
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.mkdir(remoteDir, true);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="orgb0d8b83"></a>

### rmdir(path, recursive) ==> string

Remove a directory. If removing a directory and recursive flag is set to `true`, the specified directory and all sub-directories and files will be deleted. If set to false and the directory has sub-directories or files, the action will fail.

-   **path:** string. Path to remote directory
-   **recursive:** boolean. If true, remove all files and directories in target directory. Defaults to false

**Note**: There has been at least one report that some SFTP servers will allow non-empty directories to be removed even without the recursive flag being set to true. While this is not standard behaviour, it is recommended that users verify the behaviour of rmdir if there are plans to rely on the recursive flag to prevent removal of non-empty directories.

1.  Example Use

    ```javascript
    let remoteDir = '/path/to/remote/dir';
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.rmdir(remoteDir, true);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org3c2897b"></a>

### delete(path, noErrorOK) ==> string

Delete a file on the remote server.

-   **path:** string. Path to remote file to be deleted.

-   **noErrorOK:** boolean. If true, no error is raised when you try to delete a non-existent file. Default is false.

1.  Example Use

    ```javascript
    let remoteFile = '/path/to/remote/file.txt';
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.delete(remoteFile);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org45e0ed0"></a>

### rename(fromPath, toPath) ==> string

Rename a file or directory from `fromPath` to `toPath`. You must have the necessary permissions to modify the remote file.

-   **fromPath:** string. Path to existing file to be renamed
-   **toPath:** string. Path to new file existing file is to be renamed to. Should not already exist.

1.  Example Use

    ```javascript
    let from = '/remote/path/to/old.txt';
    let to = '/remote/path/to/new.txt';
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.rename(from, to);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org68239f4"></a>

### posixRename(fromPath, toPath) ==> string

This method uses the openssh POSIX rename extension introduced in OpenSSH 4.8. The advantage of this version of rename over standard SFTP rename is that it is an atomic operation and will allow renaming a resource where the destination name exists. The POSIX rename will also work on some file systems which do not support standard SFTP rename because they don't support the system hardlink() call. The POSIX rename extension is available on all openSSH servers from 4.8 and some other implementations. This is an extension to the standard SFTP protocol and therefore is not supported on all sftp servers.

-   **fromPath:** string. Path to existing file to be renamed.
-   **toPath:** string. Path for new name. If it already exists, it will be replaced by file specified in fromPath

```javascript
let from = '/remote/path/to/old.txt';
let to = '/remote/path/to/new.txt';
let client = new Client();

client.connect(config)
  .then(() => {
    return client.posixRename(from, to);
  })
  .then(() => {
    return client.end();
  })
  .catch(err => {
    console.error(err.message);
  });
```


<a id="org7e61dd3"></a>

### chmod(path, mode) ==> string

Change the mode (read, write or execute permissions) of a remote file or directory.

-   **path:** string. Path to the remote file or directory
-   **mode:** octal. New mode to set for the remote file or directory

1.  Example Use

    ```javascript
    let path = '/path/to/remote/file.txt';
    let newMode = 0o644;  // rw-r-r
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        return client.chmod(path, newMode);
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="org0c79ede"></a>

### realPath(path) ===> string

Converts a relative path to an absolute path on the remote server. This method is mainly used internally to resolve remote path names.

**Warning**: Currently, there is a platform inconsistency with this method on win32 platforms. For servers running on non-win32 platforms, providing a path which does not exist on the remote server will result in an empty e.g. '', absolute path being returned. On servers running on win32 platforms, a normalised path will be returned even if the path does not exist on the remote server. It is therefore advised not to use this method to also verify a path exists. instead, use the `exist()` method.

-   **path:** A file path, either relative or absolute. Can handle '.' and '..', but does not expand '~'.


<a id="org74c2a96"></a>

### cwd() ==> string

Returns what the server believes is the current remote working directory.


<a id="org7774805"></a>

### uploadDir(srcDir, dstDir, options) ==> string

Upload the directory specified by `srcDir` to the remote directory specified by `dstDir`. The `dstDir` will be created if necessary. Any sub directories within `srcDir` will also be uploaded. Any existing files in the remote path will be overwritten.

The upload process also emits 'upload' events. These events are fired for each successfully uploaded file. The `upload` event calls listeners with 1 argument, an object which has properties source and destination. The source property is the path of the file uploaded and the destination property is the path to where the file was uploaded. The purpose of this event is to provide some way for client code to get feedback on the upload progress. You can add your own listener using the `on()` method.

The 3rd argument is an options object with two supported properties, `filter` and `useFastput`.

The `filter` option is a function which will be called for each item to be uploaded. The function will be called with two arguments. The first argument is the full path of the item to be uploaded and the second argument is a boolean, which will be true if the target path is for a directory. The filter function will be called for each item in the source path. If the function returns true, the item will be uploaded. If it returns false, it will be filtered and not uploaded. The filter function is called via the `Array.filter` method. These array comprehension methods are known to be unsafe for asynchronous functions. Therefore, only synchronous filter functions are supported at this time.

The `useFastput` option is a boolean option. If `true`, the method will use the faster `fastPut()` method to upload files. Although this method is faster, it is not supported by all SFTP servers. Enabling this option when unsupported by the remote SFTP server will result in failures.

-   **srcDir:** A local file path specified as a string
-   **dstDir:** A remote file path specified as a string
-   **options:** An options object which supports two properties, `filter` and `useFastput`. A filter predicate function which is called for each item in the source path. The argument will receive two arguments. The first is the full path to the item and the second is a boolean which will be true if the item is a directory. If the function returns true, the item will be uploaded, otherwise it will be filtered out and ignored. The `useFastput` option is a boolean option. If `true`, the method will use the faster, but less supported, `fastPut()` method to transfer files. The default is to use the slightly slower, but better supported, `put()` method.

1.  Example

    ```javascript
    'use strict';
    
    // Example of using the uploadDir() method to upload a directory
    // to a remote SFTP server
    
    const path = require('path');
    const SftpClient = require('../src/index');
    
    const dotenvPath = path.join(__dirname, '..', '.env');
    require('dotenv').config({path: dotenvPath});
    
    const config = {
      host: process.env.SFTP_SERVER,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASSWORD,
      port: process.env.SFTP_PORT || 22
    };
    
    async function main() {
      const client = new SftpClient('upload-test');
      const src = path.join(__dirname, '..', 'test', 'testData', 'upload-src');
      const dst = '/home/tim/upload-test';
    
      try {
        await client.connect(config);
        client.on('upload', info => {
          console.log(`Listener: Uploaded ${info.source}`);
        });
        let rslt = await client.uploadDir(src, dst);
        return rslt;
      } catch (err) {
        console.error(err);
      } finally {
        client.end();
      }
    }
    
    main()
      .then(msg => {
        console.log(msg);
      })
      .catch(err => {
        console.log(`main error: ${err.message}`);
      });
    
    ```


<a id="orgf1a595e"></a>

### downloadDir(srcDir, dstDir, options) ==> string

Download the remote directory specified by `srcDir` to the local file system directory specified by `dstDir`. The `dstDir` directory will be created if required. All sub directories within `srcDir` will also be copied. Any existing files in the local path will be overwritten. No files in the local path will be deleted.

The method also emits `download` events to provide a way to monitor download progress. The download event listener is called with one argument, an object with two properties, source and destination. The source property is the path to the remote file that has been downloaded and the destination is the local path to where the file was downloaded to. You can add a listener for this event using the `on()` method.

The `options` argument is an options object with two supported properties, `filter` and `useFastget`. The `filter` argument is a predicate function which will be called with two arguments for each potential item to be downloaded. The first argument is the full path of the item and the second argument is a boolean, which will be true if the item is a directory. If the function returns true, the item will be included in the download. If it returns false, it will be filtered and ignored. The filter function is called via the `Array.filter` method. These array comprehension methods are known to be unsafe for asynchronous functions. Therefore, only synchronous filter functions are supported at this time.

If the `useFastget` property is set to `true`, the method will use `fastGet()` to transfer files. The `fastGet` method is faster, but not supported by all SFTP services.

-   **srcDir:** A remote file path specified as a string
-   **dstDir:** A local file path specified as a string
-   **options:** An object with two supported properties, `filter` and `useFastget`. The filter property is a function accepting two arguments, the full path to an item and a boolean value which will be true if the item is a directory. The function is called for each item in the download path and should return true to include the item and false to exclude it in the download. The `useFastget` property is a boolean. If true, the `fastGet()` method will be used to transfer files. If `false` (the default), the slower but better supported `get()` method is used. .

1.  Example

    ```javascript
    'use strict';
    
    // Example of using the downloadDir() method to upload a directory
    // to a remote SFTP server
    
    const path = require('path');
    const SftpClient = require('../src/index');
    
    const dotenvPath = path.join(__dirname, '..', '.env');
    require('dotenv').config({path: dotenvPath});
    
    const config = {
      host: process.env.SFTP_SERVER,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASSWORD,
      port: process.env.SFTP_PORT || 22
    };
    
    async function main() {
      const client = new SftpClient('upload-test');
      const dst = '/tmp';
      const src = '/home/tim/upload-test';
    
      try {
        await client.connect(config);
        client.on('download', info => {
    console.log(`Listener: Download ${info.source}`);
        });
        let rslt = await client.downloadDir(src, dst);
        return rslt;
      } finally {
        client.end();
      }
    }
    
    main()
      .then(msg => {
        console.log(msg);
      })
      .catch(err => {
        console.log(`main error: ${err.message}`);
      });
    
    ```


<a id="orgc23b9ed"></a>

### createReadStream(remotePath, options)) ==> stream object

Returns a read stream object which is attached to the remote file specified by the `remotePath` argument. This is a low level method which just returns a read stream object. Client code is fully responsible for managing and releasing the resources associated with the stream once finished i.e. closing files, removing listeners etc.

-   **remotePath:** A remote file path specified as a string
-   **options:** An options object. Supported properties are
    -   **flags:** defaults to 'r'
    -   **encoding:** defaults to null
    -   **handle:** defaults to null
    -   **mode:** 0o666
    -   **autoClose:** defaults to true. If set to false, client code is responsible for closing file descriptors when finished
    -   **start:** Default 0. Position to start reading bytes from (inclusive)
    -   **end:** Position to stop reading bytes (inclusive).


<a id="org6573ba0"></a>

### createWriteStream(remotePath, options) ==> stream object

Returns a write stream object which is attached to the remote file specified in the `remotePath` argument. This is a low level function which just returns the stream object. Client code is fully responsible for managing that object, including closing any file descriptors and removing listeners etc.

-   **remotePath:** Path to the remote file specified as a string
-   **options:** An object containing stream options. Supported properties include
    -   **flags:** default 'w'
    -   **encoding:** default null
    -   **mode:** 0o666
    -   **autoClose:** true
    -   **start:** Byte position to start writing from (inclusive). May require changing flag to 'r+'.


<a id="org1b3d33d"></a>

### rcopy(srcPath, dstPath) ==> string

Perform a remote file copy. The file identified by the `srcPath` argument will be copied to the file specified as the `dstPath` argument. The directory where `dstPath` will be placed must exist, but the actual file must not i.e. no overwrites allowed.

-   **srcPath:** Path to remote file to be copied specified as a string
-   **dstPath:** Path to where the copy will be created specified as a string


<a id="org722a5ee"></a>

### end() ==> boolean

Ends the current client session, releasing the client socket and associated resources. This function also removes all listeners associated with the client.

1.  Example Use

    ```javascript
    let client = new Client();
    
    client.connect(config)
      .then(() => {
        // do some sftp stuff
      })
      .then(() => {
        return client.end();
      })
      .catch(err => {
        console.error(err.message);
      });
    ```


<a id="orgd71b7fe"></a>

### Add and Remove Listeners

Although normally not required, you can add and remove custom listeners on the ssh2 client object. This object supports a number of events, but only a few of them have any meaning in the context of SFTP. These are

-   **error:** An error occurred. Calls listener with an error argument.
-   **end:** The socket has been disconnected. No argument.
-   **close:** The socket was closed.

1.  on(eventType, listener)

    Adds the specified listener to the specified event type. It the event type is `error`, the listener should accept 1 argument, which will be an Error object. The event handlers for `end` and `close` events have no arguments.
    
    The handlers will be added to the beginning of the listener's event handlers, so it will be called before any of the `ssh2-sftp-client` listeners.

2.  removeListener(eventType, listener)

    Removes the specified listener from the event specified in eventType. Note that the `end()` method automatically removes all listeners from the client object.


<a id="org3d8177e"></a>

# Platform Quirks & Warnings


<a id="orgf5c55fe"></a>

## Server Capabilities

All SFTP servers and platforms are not equal. Some facilities provided by `ssh2-sftp-client` either depend on capabilities of the remote server or the underlying capabilities of the remote server platform. As an example, consider `chmod()`. This command depends on a remote file system which implements the 'nix' concept of users and groups. The *win32* platform does not have the same concept of users and groups, so `chmod()` will not behave in the same way.

One way to determine whether an issue you are encountering is due to `ssh2-sftp-client` or due to the remote server or server platform is to use a simple CLI sftp program, such as openSSH's sftp command. If you observe the same behaviour using plain `sftp` on the command line, the issue is likely due to server or remote platform limitations. Note that you should not use a GUI sftp client, like `Filezilla` or `winSCP` as such GUI programs often attempt to hide these server and platform incompatibilities and will take additional steps to simulate missing functionality etc. You want to use a CLI program which does as little as possible.


<a id="org02bf649"></a>

## Issues with `fastPut()` and `fastGet()` Methods

The `fastPut()` and `fastGet()` methods are known to be somewhat dependent on SFTP server capabilities. Some SFTP servers just do not work correctly with concurrent connections and some are known to have issues with negotiating packet sizes. These issues can sometimes be resolved by tweaking the options supplied to the methods, such as setting number of concurrent connections or a specific packet size.

To see an example of the type of issues you can observe with `fastPut()` or `fastGet()`, have a look at [issue 407](https://github.com/theophilusx/ssh2-sftp-client/issues/407), which describes the experiences of one user. Bottom line, when it works, it tends to work well and be significantly faster than using just `get()` or `put()`. However, when developing code to run against different SFTP servers, especially where you are unable to test against each server, you are likely better off just using `get()` and `put()` or structuring your code so that users can select which method to use (this is what `ssh2-sftp-client` does - for example, see the `!downloadDir()` and `uploadDir()` methods.


<a id="org620202c"></a>

## Promises, Events & Managing Exceptions

One of the challenges in providing a Promise based API over a module like SSH2, which is event based is how to ensure events are handled appropriately. The challenge is due to the synchronous nature of events. You cannot use `try/catch` for events because you have no way of knowing when the event might fire. For example, it could easily fire after your `try/catch` block as completed execution.

Things become even more complicated once you mix in Promises. When you define a promise, you have to methods which can be called to fulfil a promise, `resolve` and `reject`. Only one can be called - once you call `resolve`, you cannot call `reject` (well, you can call it, but it won't have any impact on the fulfilment status of the promise). The problem arises when an event, for example an `error` event is fired either after you have resolved a promise or possibly in-between promises. If you don't catch the `error` event, your script will likely crash with an `uncaught exception` error.

To make matters worse, some servers, particularly servers running on a Windows platform, will raise multiple errors for the same error *event*. For example, when you attempt to connect with a bad username or password, you will get a `All authentication methods have failed` exception. However, under Windows, you will also get a `Connection reset by peer` exception. If we reject the connect promise based on the authentication failure exception, what do we do with the `reset by peer` exception? More critically, what will handle that exception given the promise has already been fulfilled and completed? To make matters worse, it seems that Windows based servers also raise an error event for *non-errors*. For example, when you call the `end()` method, the connection is closed. On windows, this also results in a *connection reset by peer* error. While it could be argued that the remote server resetting the connection after receiving a disconnect request is not an error, it doesn't change the fact that one is raised and we need to somehow deal with it.

To handle this, `ssh2-sftp-client` implements a couple of strategies. Firstly, when you call one of the module's methods, it adds `error`, `end` and `close` event listeners which will call the `reject` method on the enclosing promise. It also keeps track of whether an error has been handled and if it has, it ignores any subsequent errors until the promise ends. Typically, the first error caught has the most relevant information and any subsequent error events are less critical or informative, so ignoring them has no negative impact. Provided one of the events is raised before the promise is fulfilled, these handlers will consume the event and deal with it appropriately.

In testing, it was found that in some situations, particularly during connect operations, subsequent errors fired with a small delay. This prevents the errors from being handled by the event handlers associated with the connect promise. To deal with this, a small 500ms delay has been added to the connect() method, which effectively delays the removal of the event handlers until all events have been caught.

The other area where additional events are fired is during the end() call. To deal with these events, the `end()` method sets up listeners which will simply ignore additional `error`, `end` and `close` events. It is assumed that once you have called `end()` you really only care about any main error which occurs and no longer care about other errors that may be raised as the connection is terminated.

In addition to the promise based event handlers, `ssh2-sftp-client` also implements global event handlers which will catch any `error`, `end` or `close` events. Essentially, these global handlers only reset the `sftp` property of the client object, effectively ensuring any subsequent calls are rejected and in the case of an error, send the error to the console.


<a id="org4f7acfa"></a>

### Adding Custom Handlers

While the above strategies appear to work for the majority of use cases, there are always going to be edge cases which require more flexible or powerful event handling. To support this, the `on()` and `removeListener()` methods are provided. Any event listener added using the `on()` method will be added at the beginning of the list of handlers for that event, ensuring it will be called before any global or promise local events. See the documentation for the `on()` method for details.


<a id="org3c27736"></a>

## Windows Based Servers

It appears that when the sftp server is running on Windows, a *ECONNRESET* error signal is raised when the end() method is called. Unfortunately, this signal is raised after a considerable delay. This means we cannot remove the error handler used in the end() promise as otherwise you will get an uncaught exception error. Leaving the handler in place, even though we will ignore this error, solves that issue, but unfortunately introduces a new problem. Because we are not removing the listener, if you re-use the client object for subsequent connections, an additional error handler will be added. If this happens more than 11 times, you will eventually see the Node warning about a possible memory leak. This is because node monitors the number of error handlers and if it sees more than 11 added to an object, it assumes there is a problem and generates the warning.

The best way to avoid this issue is to not re-use client objects. Always generate a new sftp client object for each new connection.


<a id="orga7c9b2c"></a>

## Don't Re-use SftpClient Objects

Due to an issue with *ECONNRESET* error signals when connecting to Windows based SFTP servers, it is not possible to remove the error handler in the end() method. This means that if you re-use the SftpClient object for multiple connections e.g. calling connect(), then end(), then connect() etc, you run the risk of multiple error handlers being added to the SftpClient object. After 11 handlers have been added, Node will generate a possible memory leak warning.

To avoid this problem, don't re-use SftpClient objects. Generate a new SftpClient object for each connection. You can perform multiple actions with a single connection e.g. upload multiple files, download multiple files etc, but after you have called end(), you should not try to re-use the object with a further connect() call. Create a new object instead.


<a id="org24783d4"></a>

# FAQ


<a id="orga3db9c4"></a>

## Remote server drops connections with only an end event

Many SFTP servers have rate limiting protection which will drop connections once a limit has been reached. In particular, openSSH has the setting `MaxStartups`, which can be a tuple of the form `max:drop:full` where `max` is the maximum allowed unauthenticated connections, `drop` is a percentage value which specifies percentage of connections to be dropped once `max` connections has been reached and `full` is the number of connections at which point all subsequent connections will be dropped. e.g. `10:30:60` means allow up to 10 unauthenticated connections after which drop 30% of connection attempts until reaching 60 unauthenticated connections, at which time, drop all attempts.

Clients first make an unauthenticated connection to the SFTP server to begin negotiation of protocol settings (cipher, authentication method etc). If you are creating multiple connections in a script, it is easy to exceed the limit, resulting in some connections being dropped. As SSH2 only raises an 'end' event for these dropped connections, no error is detected. The `ssh2-sftp-client` now listens for `end` events during the connection process and if one is detected, will reject the connection promise.

One way to avoid this type of issue is to add a delay between connection attempts. It does not need to be a very long delay - just sufficient to permit the previous connection to be authenticated. In fact, the default setting for openSSH is `10:30:60`, so you really just need to have enough delay to ensure that the 1st connection has completed authentication before the 11th connection is attempted.


<a id="org1eb66a8"></a>

## How can I pass writeable stream as dst for get method?

If the dst argument passed to the get method is a writeable stream, the remote file will be piped into that writeable. If the writeable you pass in is a writeable stream created with `fs.createWriteStream()`, the data will be written to the file specified in the constructor call to `createWriteStream()`.

The writeable stream can be any type of write stream. For example, the below code will convert all the characters in the remote file to upper case before it is saved to the local file system. This could just as easily be something like a gunzip stream from `zlib`, enabling you to decompress remote zipped files as you bring them across before saving to local file system.

```javascript
'use strict';

// Example of using a writeable with get to retrieve a file.
// This code will read the remote file, convert all characters to upper case
// and then save it to a local file

const Client = require('../src/index.js');
const path = require('path');
const fs = require('fs');
const through = require('through2');

const config = {
  host: 'arch-vbox',
  port: 22,
  username: 'tim',
  password: 'xxxx'
};

const sftp = new Client();
const remoteDir = '/home/tim/testServer';

function toupper() {
  return through(function(buf, enc, next) {
    next(null, buf.toString().toUpperCase());
  });
}

sftp
  .connect(config)
  .then(() => {
    return sftp.list(remoteDir);
  })
  .then(data => {
    // list of files in testServer
    console.dir(data);
    let remoteFile = path.join(remoteDir, 'test.txt');
    let upperWtr = toupper();
    let fileWtr = fs.createWriteStream(path.join(__dirname, 'loud-text.txt'));
    upperWtr.pipe(fileWtr);
    return sftp.get(remoteFile, upperWtr);
  })
  .then(() => {
    return sftp.end();
  })
  .catch(err => {
    console.error(err.message);
  });
```


<a id="org7de7f96"></a>

## How can I upload files without having to specify a password?

There are a couple of ways to do this. Essentially, you want to setup SSH keys and use these for authentication to the remote server.

One solution, provided by @KalleVuorjoki is to use the SSH agent process. **Note**: SSH<sub>AUTH</sub><sub>SOCK</sub> is normally created by your OS when you load the ssh-agent as part of the login session.

```javascript
let sftp = new Client();
sftp.connect({
  host: 'YOUR-HOST',
  port: 'YOUR-PORT',
  username: 'YOUR-USERNAME',
  agent: process.env.SSH_AUTH_SOCK
}).then(() => {
  sftp.fastPut(/* ... */)
}
```

Another alternative is to just pass in the SSH key directly as part of the configuration.

```javascript
let sftp = new Client();
sftp.connect({
  host: 'YOUR-HOST',
  port: 'YOUR-PORT',
  username: 'YOUR-USERNAME',
  privateKey: fs.readFileSync('/path/to/ssh/key')
}).then(() => {
  sftp.fastPut(/* ... */)
}
```


<a id="orgc09e933"></a>

## How can I connect through a Socks Proxy

This solution was provided by @jmorino.

When a SOCKS 5 client is connected it must be ingested by ssh2-sftp-client immediately, otherwise a timeout occurs.

```javascript
import { SocksClient } from 'socks';
import SFTPClient from 'ssh2-sftp-client';

const host = 'my-sftp-server.net';
const port = 22; // default SSH/SFTP port on remote server

// connect to SOCKS 5 proxy
const { socket } = await SocksClient.createConnection({
  proxy: {
    host: 'my.proxy', // proxy hostname
    port: 1080, // proxy port
    type: 5, // for SOCKS v5
  },
  command: 'connect',
  destination: { host, port } // the remote SFTP server
});

const client = new SFTPClient();
client.connect({
  host,
  sock: socket, // pass the socket to proxy here (see ssh2 doc)
  // other config options
})

// client is connected
```


<a id="org386db71"></a>

## Timeout while waiting for handshake or handshake errors

Some users have encountered the error 'Timeout while waiting for handshake' or 'Handshake failed, no matching client->server ciphers. This is often due to the client not having the correct configuration for the transport layer algorithms used by ssh2. One of the connect options provided by the ssh2 module is `algorithm`, which is an object that allows you to explicitly set the key exchange, ciphers, hmac and compression algorithms as well as server host key used to establish the initial secure connection. See the SSH2 documentation for details. Getting these parameters correct usually resolves the issue.

When encountering this type of problem, one worthwhile approach is to use openSSH's CLI sftp program with the `-v` switch to raise logging levels. This will show you what algorithms the CLI is using. You can then use this information to match the names with the accepted algorithm names documented in the `ssh2` README to set the properties in the `algorithms` object.


<a id="orgf688502"></a>

## How can I limit upload/download speed

If you want to limit the amount of bandwidth used during upload/download of data, you can use a stream to limit throughput. The following example was provided by *kennylbj*. Note that there is a caveat that we must set the `autoClose` flag to false to avoid calling an extra `_read()` on a closed stream that may cause \_get Permission Denied error in ssh2-streams.

```javascript


const Throttle = require('throttle');
const progress = require('progress-stream');

// limit download speed
const throttleStream = new Throttle(config.throttle);

// download progress stream
const progressStream = progress({
  length: fileSize,
  time: 500,
});
progressStream.on('progress', (progress) => {
  console.log(progress.percentage.toFixed(2));
});

const outStream = createWriteStream(localPath);

// pipe streams together
throttleStream.pipe(progressStream).pipe(outStream);

try {
  // set autoClose to false
  await client.get(remotePath, throttleStream, { autoClose: false });
} catch (e) {
  console.log('sftp error', e);
} finally {
  await client.end();
}
```


<a id="orgf779489"></a>

## Connection hangs or fails for larger files

This was contributed by Ladislav Jacho. Thanks.

A symptom of this issue is that you are able to upload small files, but uploading larger ones fail. You probably have an MTU/fragmentation problem. For each network interface on both client and server set the MTU to 576, e.g. `ifconfig eth0 mtu 576`. If that works, you need to find the largest MTU which will work for your network. An MTU which is too small will adversely affect throughput speed. A common value to use is an MTU of 1400.

For more explanation, see [issue #342](https://github.com/theophilusx/ssh2-sftp-client/issues/342).


<a id="org85e6656"></a>

## Typescript definition file out of date

This project does not use Typescript. However, typescript definition files are provided by other 3rd parties. Sometimes, these definition files have not stayed up-to-date with the current version of this module. If you encounter this issue, you need to report it to the party responsible for the definition file, not this project.


<a id="org5de1977"></a>

# Examples

I have started collecting example scripts in the example directory of the repository. These are mainly scripts I have put together in order to investigate issues or provide samples for users. They are not robust, lack adequate error handling and may contain errors. However, I think they are still useful for helping developers see how the module and API can be used.


<a id="org7956476"></a>

# Troubleshooting

The `ssh2-sftp-client` module is essentially a wrapper around the `ssh2` and `ssh2-streams` modules, providing a higher level `promise` based API. When you run into issues, it is important to try and determine where the issue lies - either in the ssh2-sftp-client module or the underlying `ssh2` and `ssh2-streams` modules. One way to do this is to first identify a minimal reproducible example which reproduces the issue. Once you have that, try to replicate the functionality just using the `ssh2` and `ssh2-streams` modules. If the issue still occurs, then you can be fairly confident it is something related to those later 2 modules and therefore and issue which should be referred to the maintainer of that module.

The `ssh2` and `ssh2-streams` modules are very solid, high quality modules with a large user base. Most of the time, issues with those modules are due to client misconfiguration. It is therefore very important when trying to diagnose an issue to also check the documentation for both `ssh2` and `ssh2-streams`. While these modules have good defaults, the flexibility of the ssh2 protocol means that not all options are available by default. You may need to tweak the connection options, ssh2 algorithms and ciphers etc for some remote servers. The documentation for both the `ssh2` and `ssh2-streams` module is quite comprehensive and there is lots of valuable information in the issue logs.

If you run into an issue which is not repeatable with just the `ssh2` and `ssh2-streams` modules, then please log an issue against the `ssh2-sftp-client` module and I will investigate. Please note the next section on logging issues.

Note also that in the repository there are two useful directories. The first is the examples directory, which contain some examples of using `ssh2-sftp-client` to perform common tasks. A few minutes reviewing these examples can provide that additional bit of detail to help fix any problems you are encountering.

The second directory is the validation directory. I have some very simple scripts in this directory which perform basic tasks using only the `ssh2` modules (no `ssh2-sftp-client` module). These can be useful when trying to determine if the issue is with the underlying `ssh2` module or the `ssh2-sftp-client` wrapper module.


<a id="orgd59440f"></a>

## Common Errors

There are some common errors people tend to make when using Promises or Async/Await. These are by far the most common problem found in issues logged against this module. Please check for some of these before logging your issue.


<a id="org230c2d7"></a>

### Not returning the promise in a `then()` block

All methods in `ssh2-sftp-client` return a Promise. This means methods are executed *asynchrnously*. When you call a method inside the `then()` block of a promise chain, it is critical that you return the Promise that call generates. Failing to do this will result in the `then()` block completing and your code starting execution of the next `then()`, `catch()` or `finally()` block before your promise has been fulfilled. For example, the following will not do what you expect

```javascript
sftp.connect(config)
  .then(() => {
    sftp.fastGet('foo.txt', 'bar.txt');
  }).then(rslt => {
    console.log(rslt);
    sftp.end();
  }).catch(e => {
    console.error(e.message);
  });
```

In the above code, the `sftp.end()` method will almost certainly be called before `sftp.fastGet()` has been fulfilled (unless the *foo.txt* file is really small!). In fact, the whole promise chain will complete and exit even before the `sftp.end()` call has been fulfilled. The correct code would be something like

```javascript
sftp.connect(config)
  .then(() => {
    return sftp.fastGet('foo.txt', 'bar.txt');
  }).then(rslt => {
    console.log(rslt);
    return sftp.end();
  }).catch(e => {
    console.error(e.message);
  });
```

Note the `return` statements. These ensure that the Promise returned by the client method is returned into the promise chain. It will be this promise the next block in the chain will wait on to be fulfilled before the next block is executed. Without the return statement, that block will return the default promise for that block, which essentially says *this block has been fulfilled*. What you really want is the promise which says *your sftp client method call has been fulfilled*.

A common symptom of this type of error is for file uploads or download to fail to complete or for data in those files to be truncated. What is happening is that the connection is being ended before the transfer has completed.


<a id="org83e36d2"></a>

### Mixing Promise Chains and Async/Await

Another common error is to mix Promise chains and async/await calls. This is rarely a great idea. While you can do this, it tends to create complicated and difficult to maintain code. Select one approach and stick with it. Both approaches are functionally equivalent, so there is no reason to mix up the two paradigms. My personal preference would be to use async/await as I think that is more *natural* for most developers. For example, the following is more complex and difficult to follow than necessary (and has a bug!)

```javascript
sftp.connect(config)
  .then(() => {
    return sftp.cwd();
  }).then(async (d) => {
    console.log(`Remote directory is ${d}`);
    try {
      await sftp.fastGet(`${d}/foo.txt`, `./bar.txt`);
    }.catch(e => {
      console.error(e.message);
    });
  }).catch(e => {
    console.error(e.message);
  }).finally(() => {
    sftp.end();
  });
```

The main bug in the above code is the `then()` block is not returning the Promise generated by the call to `sftp.fastGet()`. What it is actually returning is a fulfilled promise which says the `then()` block has been run (note that the await'ed promise is not being returned and is therefore outside the main Promise chain). As a result, the `finally()` block will be executed before the await promise has been fulfilled.

Using async/await inside the promise chain has created unnecessary complexity and leads to incorrect assumptions regarding how the code will execute. A quick glance at the code is likely to give the impression that execution will wait for the `sftp.fastGet()` call to be fulfilled before continuing. This is not the case. The code would be more clearly expressed as either

```javascript
sftp.connect(config)
  .then(() => {
    return sftp.cwd();
  }).then(d => {
    console.log(`remote dir ${d}`);
    return sftp.fastGet(`${d}/foot.txt`, 'bar.txt');
  }).catch(e => {
    console.error(e.message);
  }).finally(() => {
    return sftp.end();
  });
```

**or, using async/await**

```javascript
async function doSftp() {
  try {
    let sftp = await sftp.connect(conf);
    let d = await sftp.cwd();
    console.log(`remote dir is ${d}`);
    await sftp.fastGet(`${d}/foo.txt`, 'bat.txt');
  } catch (e) {
    console.error(e.message);
  } finally {
    await sftp.end();
  }
}
```


<a id="org0175a34"></a>

### Try/catch and Error Handlers

Another common error is to try and use a try/catch block to catch event signals, such as an error event. In general, you cannot use try/catch blocks for asynchronous code and expect errors to be caught by the `catch` block. Handling errors in asynchronous code is one of the key reasons we now have the Promise and async/await frameworks.

The basic problem is that the try/catch block will have completed execution before the asynchronous code has completed. If the asynchronous code has not completed, then there is a potential for it to raise an error. However, as the try/catch block has already completed, there is no *catch* waiting to catch the error. It will bubble up and probably result in your script exiting with an uncaught exception error.

Error events are essentially asynchronous code. You don't know when such events will fire. Therefore, you cannot use a try/catch block to catch such event errors. Even creating an error handler which then throws an exception won't help as the key problem is that your try/catch block has already executed. There are a number of alternative ways to deal with this situation. However, the key symptom is that you see occasional uncaught error exceptions that cause your script to exit abnormally despite having try/catch blocks in your script. What you need to do is look at your code and find where errors are raised asynchronously and use an event handler or some other mechanism to manage any errors raised.


<a id="org5931953"></a>

### Server Differences

Not all SFTP servers are the same. Like most standards, the SFTP protocol has some level of interpretation and allows different levels of compliance. This means there can be differences in behaviour between different servers and code which works with one server will not work the same with another. For example, the value returned by *realpath* for non-existent objects can differ significantly. Some servers will throw an error for a particular operation while others will just return null, some servers support concurrent operations (such as used by fastGet/fastPut) while others will not and of course, the text of error messages can vary significantly. In particular, we have noticed significant differences across different platforms. It is therefore advisable to do comprehensive testing when the SFTP server is moved to a new platform. This includes moving from to a cloud based service even if the underlying platform remains the same. I have noticed that some cloud platforms can generate unexpected events, possibly related to additional functionality or features associated with the cloud implementation. For example, it appears SFTP servers running under Azure will generate an error event when the connection is closed even when the client has requested the connection be terminated. The same SFTP server running natively on Windows does not appear to exhibit such behaviour.


<a id="org1ba6229"></a>

### Avoid Concurrent Operations

Technically, SFTP should be able to perform multiple operations concurrently. As node is single threaded, what we a really talking about is running multiple execution contexts as a pool where node will switch contexts when each context is blocked due to things like waiting on network data etc. However, I have found this to be extremely unreliable and of very little benefit from a performance perspective. My recommendation is to therefore avoid executing multiple requests over the same connection in parallel (for example, generating multiple `get()` promises and using something like `Promise.all()` to resolve them.

If you are going to try and perform concurrent operations, you need to test extensively and ensure you are using data which is large enough that context switching does occur (i.e. the request is not completed in a single run). Some SFTP servers will handle concurrent operations better than others.


<a id="org83d2a4a"></a>

## Debugging Support

You can add a `debug` property to the config object passed in to `connect()` to turn on debugging. This will generate quite a lot of output. The value of the property should be a function which accepts a single string argument. For example;

```javascript
config.debug = msg => {
  console.error(msg);
};

```

Enabling debugging can generate a lot of output. If you use console.error() as the output (as in the example above), you can redirect the output to a file using shell redirection e.g.

```shell
node script.js 2> debug.log

```

If you just want to see debug messages from `ssh2-sftp-client` and exclude debug messages from the underlying `ssh2` and `ssh2-streams` modules, you can filter based on messages which start with 'CLIENT' e.g.

```javascript
{
  debug: (msg) => {
    if (msg.startsWith('CLIENT')) {
      console.error(msg);
    }
  }
}
```


<a id="orge6f0d8a"></a>

# Logging Issues

Please log an issue for all bugs, questions, feature and enhancement requests. Please ensure you include the module version, node version and platform.

I am happy to try and help diagnose and fix any issues you encounter while using the `ssh2-sftp-client` module. However, I will only put in effort if you are prepared to put in the effort to provide the information necessary to reproduce the issue. Things which will help

-   Node version you are using
-   Version of ssh2-sftp-client you are using
-   Platform your client is running on (Linux, macOS, Windows)
-   Platform and software for the remote SFTP server when possible
-   Example of your code or a minimal script which reproduces the issue you are encountering. By far, the most common issue is incorrect use of the module API. Example code can usually result in such issues being resolved very quickly.

Perhaps the best assistance is a minimal reproducible example of the issue. Once the issue can be readily reproduced, it can usually be fixed very quickly.


<a id="orgb3bfc09"></a>

# Pull Requests

Pull requests are always welcomed. However, please ensure your changes pass all tests and if you're adding a new feature, that tests for that feature are included. Likewise, for new features or enhancements, please include any relevant documentation updates.

**Note**: The `README.md` file is generated from the `README.org` file. Therefore, any documentation updates or fixes need to be made to the `README.org` file. This file is *tangled* using `Emacs` org mode. If you don't use Emacs or org-mode, don't be too concerned. The org-mode syntax is straight-forward and similar to *markdown*. I will verify any updates to `README.org` and generate a new `README.md` when necessary. The main point to note is that any changes made directly to `README.md` will not persist and will be lost when a new version is generated, so don't modify that file.

This module will adopt a standard semantic versioning policy. Please indicate in your pull request what level of change it represents i.e.

-   **Major:** Change to API or major change in functionality which will require an increase in major version number.

-   **Minor:** Minor change, enhancement or new feature which does not change existing API and will not break existing client code.

-   **Bug Fix:** No change to functionality or features. Simple fix of an existing bug.


<a id="org7870be2"></a>

# Contributors

This module was initially written by jyu213. On August 23rd, 2019, theophilusx took over responsibility for maintaining this module. A number of other people have contributed to this module, but until now, this was not tracked. My intention is to credit anyone who contributes going forward.

Thanks to the following for their contributions -

-   **jyu213:** Original author
-   **theophilusx:** Current maintainer
-   **henrytk:** Documentation fix
-   **waldyrious:** Documentation fixes
-   **james-pellow:** Cleanup and fix for connect method logic
-   **jhorbulyk:** Contributed posixRename() functionality
-   **teenangst:** Contributed fix for error code 4 in stat() method
-   **kennylbj:** Contributed example of using a throttle stream to limit upload/download bandwidth.
-   **anton-erofeev:** Documentation fix
-   **Ladislav Jacho:** Contributed solution explanation for connections hanging when transferring larger files.
-   **Emma Milner:** Contributed fix for put() bug
-   **Witni Davis:** Contributed PR to fix put() RCE when using 'finish' rather than 'close' to resolve promise
-   **Maik Marschner:** Contributed fix for connect() not returning sftp object. Also included test to check for this regression in future.
-   **cakemasher:** Contributed fix for removeTempListeners().
