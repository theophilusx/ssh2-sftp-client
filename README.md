
# Table of Contents

1.  [SSH2 SFTP Client](#org69a0fd5)
2.  [Installation](#org84361ab)
3.  [Basic Usage](#org6b092b0)
4.  [Breaking Changes](#org3da2910)
    1.  [Option Changes](#orgd77b694)
    2.  [Method Changes](#org88c83d0)
        1.  [get(srcPath, dst, options)](#org58aac64)
5.  [Documentation](#orgc136abe)
    1.  [Methods](#orga91af46)
        1.  [list](#org1ece957)
        2.  [AuxList](#org6216e50)
        3.  [Get](#orgcb5d20e)
        4.  [FastGet](#orgaba151b)
        5.  [Put](#orgf64868e)
        6.  [FastPut](#orged33ecb)
        7.  [Mkdir](#org6e4f10e)
        8.  [Rmdir](#orgc312b3c)
        9.  [Delete](#org3607972)
        10. [Rename](#orgd8b2a2e)
        11. [Chmod](#org376175e)
        12. [connect](#orge41c46b)
        13. [end](#org4ac7f69)
6.  [FAQ](#orge5bfd77)
    1.  [How can you pass writable stream as dst for get method?](#org18f2dc0)
    2.  [How can I upload files without having to specify a password?](#orgcdcb79a)
7.  [Change Log](#orgb3a5e5e)
    1.  [v4.0.0 (Current development version)](#orgc52c12c)
    2.  [V2.5.2 (Current stable version)](#org861b28f)
    3.  [V2.5.1](#org52ca38f)
    4.  [V2.5.0](#orgf6db4e6)
    5.  [V2.4.3](#orgc830512)
    6.  [V2.4.2](#org9896313)
    7.  [V2.4.1](#org875e233)
    8.  [V2.4.0](#orge00d256)
    9.  [V2.3.0](#orge19bc78)
    10. [V3.0.0 &#x2013; deprecate this version](#orgbf112f4)
    11. [V2.1.1](#org7079e95)
    12. [V2.0.1](#org2cf117a)
    13. [V1.1.0](#org20834e9)
    14. [V1.0.5:](#orgf8db795)
8.  [Logging Issues](#org47dc46c)
9.  [Pull Requests](#org7a91e02)
10. [Contributors](#org8084d91)


<a id="org69a0fd5"></a>

# SSH2 SFTP Client

an SFTP client for node.js, a wrapper around [SSH2](https://github.com/mscdex/ssh2)  which provides a high level
convenience abstraction as well as a Promise based API.

Documentation on the methods and available options in the underlying modules can
be found on the [SSH2](https://github.com/mscdex/ssh2) and [SSH2-STREAMS](https://github.com/mscdex/ssh2-streams) project pages.

Current stable release is **v2.5.2**

Current development version is **v4.0.0** and is in the **release-4.0.0** branch of
the repository.


<a id="org84361ab"></a>

# Installation

    npm install ssh2-sftp-client


<a id="org6b092b0"></a>

# Basic Usage

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


<a id="org3da2910"></a>

# Breaking Changes

Due to some incompatibilities with stream handling which breaks this module when
used with Node 10.x, some changes have been implemented that should enhance the
interface, but which also break compatibility with previous versions. 


<a id="orgd77b694"></a>

## Option Changes

-   The default encoding is null not utf8 as it was previously. This is consistent
    with the defaults for the underlying SSH2 module.
-   The usedCompressed option has been removed. None of the shh2-steams methods
    actually support this option. The 'compress' option can be set as part of the
    connection options.  See [ssh2 client event](<https://github.com/mscdex/ssh2#user-content-client-methods>).
-   The separate explicit option arguments for encoding and useCompression for some methods
    have been replaced with a single 'options' argument, which is an object that
    can have the following properties (defaults shown). See the
    [ssh2-streams](<https://github.com/mscdex/ssh2-streams>) documentation for an
    explination of the opt8ons. 
    
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


<a id="org88c83d0"></a>

## Method Changes


<a id="org58aac64"></a>

### get(srcPath, dst, options)

Used to retrieve a file from a remote SFTP server. 

-   srcPath: path to the file on the remote server
-   dst: Either a string, which will be used as the path to store the file on the
    local system or a writable stream, which will be used as the destination for a
    stream pipe. If undefined, the remote file will be read into a Buffer and
    the buffer returned.
-   options: Options for the get operation e.g. encoding.


<a id="orgc136abe"></a>

# Documentation

The connection options are the same as those offered by the underlying SSH2
module. For full details, please see [SSH2 client methods](https://github.com/mscdex/ssh2#user-content-client-methods)

All the methods will return a Promise;


<a id="orga91af46"></a>

## Methods


<a id="org1ece957"></a>

### list

Retrieves a directory listing.

    sftp.list(remoteFilePath)

The method returns a Promise, which once resolved, returns an array of objects
representing the items in the directory. The objects have the following
properties;

    {
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
    }


<a id="org6216e50"></a>

### AuxList

Retrieves a directory list that matches a pattern.
The default pattern is "\*", to list all of the files inside a directory. The
function returns a Promise, which once realised, returns an array of directory
item objects (just like `list()`). 

    sftp.auxList(remoteFilePath, pattern);

1.  Pattern examples:

        *.txt -- matches any file name that ends with .txt
        test* -- matches any file name that begins with test
        *bar* -- matches any file name that has the sequence "bar" in any position


<a id="orgcb5d20e"></a>

### Get

Get a \`ReadableStream\` from remotePath. 

    sftp.get(remoteFilePath, [options]);


<a id="orgaba151b"></a>

### FastGet

Downloads a file at remotePath to localPath using parallel reads for faster
throughput. Details on available options can be found [here](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) 

    sftp.fastGet(remotePath, localPath, [options]);


<a id="orgf64868e"></a>

### Put

upload a file from \`localPath\` or \`Buffer\`, \`Stream\` data to
\`remoteFilePath\`. **Be sure to include the file name in remoteFilePath!**

    sftp.put(localFilePath, remoteFilePath, [optons]);
    sftp.put(Buffer, remoteFilePath, [options]);
    sftp.put(Stream, remoteFilePath, [options]);


<a id="orged33ecb"></a>

### FastPut

Uploads a file from localPath to remotePath using parallel reads for faster
throughput. Details on available options are available [here](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) 

    sftp.fastPut(localPath, remotePath, [options]);


<a id="org6e4f10e"></a>

### Mkdir

Create a new directory. If the recursive flag is set to true, the method will
create any directories in the path which do not already exist. Recursive flag
defaults to false.

    // recursive default is false, if true, it will create directory recursive
    sftp.mkdir(remoteFilePath, recursive);


<a id="orgc312b3c"></a>

### Rmdir

Remove a directory or file. If removing a directory and recursive flag is set to
`true`, the specified directory and all sub-directories and files will be
deleted. If set to false and the directory has sub-directories or files, the
action will fail. 

    // recursive default is false, if true, it will remove directory
    // recursive even if is not empty
    sftp.rmdir(localPath, recursive);


<a id="org3607972"></a>

### Delete

Delete a file.

    sftp.delete(remoteFilePath);


<a id="orgd8b2a2e"></a>

### Rename

Rename a file or directory.

    sftp.rename(remoteSourcePath, remoteDestPath);


<a id="org376175e"></a>

### Chmod

Change the mode (read, write or execute) of a remote file or directory.

    sftp.chmod(remoteDestPath, mode);


<a id="orge41c46b"></a>

### connect

Connect to an sftp server. Documentation for connection options is available [here](https://github.com/mscdex/ssh2#user-content-client-methods)

    sftp.connect({
      host: example.com,
      port: 22,
      username: 'donald',
      password: 'youarefired'
    });


<a id="org4ac7f69"></a>

### end

Close the sftp connection.

    sftp.end();


<a id="orge5bfd77"></a>

# FAQ


<a id="org18f2dc0"></a>

## How can you pass writable stream as dst for get method?

If the dst argument passed to the get method is a writeable stream, the remote
file will be piped into that writeable. If the writeable you pass in is a
writeable stream created with `fs.createWriteStream()`, the data will be written
to the file specified in the constructor call to `createWriteStream()`. 

The wrteable stream can be any type of write stream. For example, the below code
will convert all the characters in the remote file to upper case before it is
saved to the local file system. This could just as easily be something like a
gunzip stream from `zlib`, enabling you to decompress remote zipped files as you
bring thenm across before saving to local file system. 

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


<a id="orgcdcb79a"></a>

## How can I upload files without having to specify a password?

There are a couple of ways to do this. Essentially, you want to setup SSH keys
and use these for authentication to the remote server. 

One solution, provided by @KalleVuorjoki is to use the SSH agent
process. **Note**: SSH<sub>AUTH</sub><sub>SOCK</sub> is normally created by your OS when you load the
ssh-agent as part of the login session. 

    let sftp = new Client();
    sftp.connect({
      host: 'YOUR-HOST',
      port: 'YOUR-PORT',
      username: 'YOUR-USERNAME',
      agent: process.env.SSH_AUTH_SOCK
    }).then(() => {
      sftp.fastPut(....)
    }

Another alternative is to just pass in the SSH key directly as part of the
configuration. 

    let sftp = new Client();
    sftp.connect({
      host: 'YOUR-HOST',
      port: 'YOUR-PORT',
      username: 'YOUR-USERNAME',
      privateKey: fs.readFileSync('/path/to/ssh/ke')
    }).then(() => {
      sftp.fastPut(.....)
    }


<a id="orgb3a5e5e"></a>

# Change Log


<a id="orgc52c12c"></a>

## v4.0.0 (Current development version)

-   Remove support for node < 8.x
-   Fix connection retry feature


<a id="org861b28f"></a>

## V2.5.2 (Current stable version)

-   Repository transferred to theophilusx
-   Fix error in package.json pointing to wrong repository


<a id="org52ca38f"></a>

## V2.5.1

-   Apply 4 pull requests to address minor issues prior to transfer


<a id="orgf6db4e6"></a>

## V2.5.0

-   ???


<a id="orgc830512"></a>

## V2.4.3

-   merge #108, #110
    -   fix connect promise if connection ends


<a id="org9896313"></a>

## V2.4.2

-   merge #105
    -   fix windows path


<a id="org875e233"></a>

## V2.4.1

-   merge pr #99, #100
    -   bug fix


<a id="orge00d256"></a>

## V2.4.0

-   Requires node.js v7.5.0 or above.
-   merge pr #97, thanks for @theophilusx
    -   Remove emmitter.maxListener warnings
    -   Upgraded ssh2 dependency from 0.5.5 to 0.6.1
    -   Enhanced error messages to provide more context and to be more consistent
    -   re-factored test
    -   Added new 'exists' method and re-factored mkdir/rmdir


<a id="orge19bc78"></a>

## V2.3.0

-   add: \`stat\` method
-   add \`fastGet\` and \`fastPut\` method.
-   fix: \`mkdir\` file exists decision logic


<a id="orgbf112f4"></a>

## V3.0.0 &#x2013; deprecate this version

-   change: \`sftp.get\` will return chunk not stream anymore
-   fix: get readable not emitting data events in node 10.0.0


<a id="org7079e95"></a>

## V2.1.1

-   add: event listener. [doc](<https://github.com/jyu213/ssh2-sftp-client#Event>)
-   add: \`get\` or \`put\` method add extra options [pr#52](<https://github.com/jyu213/ssh2-sftp-client/pull/52>)


<a id="org2cf117a"></a>

## V2.0.1

-   add: \`chmod\` method [pr#33](<https://github.com/jyu213/ssh2-sftp-client/pull/33>)
-   update: upgrade ssh2 to V0.5.0 [pr#30](<https://github.com/jyu213/ssh2-sftp-client/pull/30>)
-   fix: get method stream error reject unwork [#22](<https://github.com/jyu213/ssh2-sftp-client/issues/22>)
-   fix: return Error object on promise rejection [pr#20](<https://github.com/jyu213/ssh2-sftp-client/pull/20>)


<a id="org20834e9"></a>

## V1.1.0

-   fix: add encoding control support for binary stream


<a id="orgf8db795"></a>

## V1.0.5:

-   fix: multi image upload
-   change: remove \`this.client.sftp\` to \`connect\` function


<a id="org47dc46c"></a>

# Logging Issues

Please log an issue for all bugs, questions, feature and enhancement
requests. Please ensure you include the module version, node version and
platform. 


<a id="org7a91e02"></a>

# Pull Requests

Pull requests are always welcomed. However, please ensure your changes pass all
tests and if your adding a new feature, that tests for that feature are
included. Likewise, for new features or enhancements, please include any
relevant documentation updates. 

This module will adopt a standard semantic versioning policy. Please indicate in
your pull request what level of change it represents i.e.

-   **Major:** Change to API or major change in functionality which will require an
    increase in major version number.
-   **Ninor:** Minor change, enhancement or new feature which does not change
    existing API and will not break existing client code.
-   **Bug Fix:** No change to functionality or features. Simple fix of an existing
    bug.


<a id="org8084d91"></a>

# Contributors

This module was initially written by jyu213. On August 23rd, 2019, theophilusx
took over responsibility for maintaining this module. A number of other people
have contributed to this module, but until now, this was not tracked. My
intention is to credit anyone who contributes going forward. 

-   **jyu213:** Original author
-   **theophilusx:** Current maintainer

