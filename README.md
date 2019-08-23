
# Table of Contents

1.  [SSH2 SFTP Client](#org4b114ac)
2.  [Installation](#org6fd9ed6)
3.  [Basic Usage](#orgc45fec5)
4.  [Breaking Changes](#orgfb0f63d)
    1.  [Option Changes](#org06673f1)
    2.  [Method Changes](#org7443a5b)
        1.  [get(srcPath, dst, options)](#org43e8df0)
5.  [Documentation](#org394fd48)
    1.  [Methods](#org7d997b4)
        1.  [list](#org333c9ca)
        2.  [AuxList](#org6bf94cd)
        3.  [Get](#org430b4ad)
        4.  [FastGet](#org4ad855c)
        5.  [Put](#org42ac83d)
        6.  [FastPut](#orgb5a9497)
        7.  [Mkdir](#org5f43265)
        8.  [Rmdir](#org0a87096)
        9.  [Delete](#orgbb42fdf)
        10. [Rename](#org21156b7)
        11. [Chmod](#orgb2445f9)
        12. [connect](#orgc82a1ca)
        13. [end](#org386656b)
6.  [FAQ](#org67cd819)
7.  [Change Log](#orgfd5587d)
    1.  [v4.0.0 (Current development version)](#orgb47c042)
    2.  [V2.5.2 (Current stable version)](#org8a509ed)
    3.  [V2.5.1](#orgc28e630)
    4.  [V2.5.0](#org0c215b0)
    5.  [V2.4.3](#orgb4cb0e1)
    6.  [V2.4.2](#orgf8f0603)
    7.  [V2.4.1](#org76f0354)
    8.  [V2.4.0](#orgfe24094)
    9.  [V2.3.0](#org8f8109d)
    10. [V3.0.0 &#x2013; deprecate this version](#org71babc3)
    11. [V2.1.1](#orgf4ae2b5)
    12. [V2.0.1](#orgf9a5f29)
    13. [V1.1.0](#orgc156504)
    14. [V1.0.5:](#orgf0aa6bc)
8.  [Logging Issues](#orgcb2577e)
9.  [Pull Requests](#org6a44eb7)
10. [Contributors](#org8002dc9)


<a id="org4b114ac"></a>

# SSH2 SFTP Client

an SFTP client for node.js, a wrapper around [SSH2](https://github.com/mscdex/ssh2)  which provides a high level
convenience abstraction as well as a Promise based API.

Documentation on the methods and available options in the underlying modules can
be found on the [SSH2](https://github.com/mscdex/ssh2) and [SSH2-STREAMS](https://github.com/mscdex/ssh2-streams) project pages.

Current stable release is **v2.5.2**

Current development version is **v4.0.0** and is in the **release-4.0.0** branch of
the repository.


<a id="org6fd9ed6"></a>

# Installation

    npm install ssh2-sftp-client


<a id="orgc45fec5"></a>

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


<a id="orgfb0f63d"></a>

# Breaking Changes

Due to some incompatibilities with stream handling which breaks this module when
used with Node 10.x, some changes have been implemented that should enhance the
interface, but which also break compatibility with previous versions. 


<a id="org06673f1"></a>

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


<a id="org7443a5b"></a>

## Method Changes


<a id="org43e8df0"></a>

### get(srcPath, dst, options)

Used to retrieve a file from a remote SFTP server. 

-   srcPath: path to the file on the remote server
-   dst: Either a string, which will be used as the path to store the file on the
    local system or a writable stream, which will be used as the destination for a
    stream pipe. If undefined, the remote file will be read into a Buffer and
    the buffer returned.
-   options: Options for the get operation e.g. encoding.


<a id="org394fd48"></a>

# Documentation

The connection options are the same as those offered by the underlying SSH2
module. For full details, please see [SSH2 client methods](https://github.com/mscdex/ssh2#user-content-client-methods)

All the methods will return a Promise;


<a id="org7d997b4"></a>

## Methods


<a id="org333c9ca"></a>

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


<a id="org6bf94cd"></a>

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


<a id="org430b4ad"></a>

### Get

Get a \`ReadableStream\` from remotePath. 

    sftp.get(remoteFilePath, [options]);


<a id="org4ad855c"></a>

### FastGet

Downloads a file at remotePath to localPath using parallel reads for faster
throughput. Details on available options can be found [here](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) 

    sftp.fastGet(remotePath, localPath, [options]);


<a id="org42ac83d"></a>

### Put

upload a file from \`localPath\` or \`Buffer\`, \`Stream\` data to
\`remoteFilePath\`. **Be sure to include the file name in remoteFilePath!**

    sftp.put(localFilePath, remoteFilePath, [optons]);
    sftp.put(Buffer, remoteFilePath, [options]);
    sftp.put(Stream, remoteFilePath, [options]);


<a id="orgb5a9497"></a>

### FastPut

Uploads a file from localPath to remotePath using parallel reads for faster
throughput. Details on available options are available [here](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) 

    sftp.fastPut(localPath, remotePath, [options]);


<a id="org5f43265"></a>

### Mkdir

Create a new directory. If the recursive flag is set to true, the method will
create any directories in the path which do not already exist. Recursive flag
defaults to false.

    // recursive default is false, if true, it will create directory recursive
    sftp.mkdir(remoteFilePath, recursive);


<a id="org0a87096"></a>

### Rmdir

Remove a directory or file. If removing a directory and recursive flag is set to
`true`, the specified directory and all sub-directories and files will be
deleted. If set to false and the directory has sub-directories or files, the
action will fail. 

    // recursive default is false, if true, it will remove directory
    // recursive even if is not empty
    sftp.rmdir(localPath, recursive);


<a id="orgbb42fdf"></a>

### Delete

Delete a file.

    sftp.delete(remoteFilePath);


<a id="org21156b7"></a>

### Rename

Rename a file or directory.

    sftp.rename(remoteSourcePath, remoteDestPath);


<a id="orgb2445f9"></a>

### Chmod

Change the mode (read, write or execute) of a remote file or directory.

    sftp.chmod(remoteDestPath, mode);


<a id="orgc82a1ca"></a>

### connect

Connect to an sftp server. Documentation for connection options is available [here](https://github.com/mscdex/ssh2#user-content-client-methods)

    sftp.connect({
      host: example.com,
      port: 22,
      username: 'donald',
      password: 'youarefired'
    });


<a id="org386656b"></a>

### end

Close the sftp connection.

    sftp.end();


<a id="org67cd819"></a>

# FAQ


<a id="orgfd5587d"></a>

# Change Log


<a id="orgb47c042"></a>

## v4.0.0 (Current development version)

-   Remove support for node < 8.x
-   Fix connection retry feature


<a id="org8a509ed"></a>

## V2.5.2 (Current stable version)

-   Repository transferred to theophilusx
-   Fix error in package.json pointing to wrong repository


<a id="orgc28e630"></a>

## V2.5.1

-   Apply 4 pull requests to address minor issues prior to transfer


<a id="org0c215b0"></a>

## V2.5.0

-   ???


<a id="orgb4cb0e1"></a>

## V2.4.3

-   merge #108, #110
    -   fix connect promise if connection ends


<a id="orgf8f0603"></a>

## V2.4.2

-   merge #105
    -   fix windows path


<a id="org76f0354"></a>

## V2.4.1

-   merge pr #99, #100
    -   bug fix


<a id="orgfe24094"></a>

## V2.4.0

-   Requires node.js v7.5.0 or above.
-   merge pr #97, thanks for @theophilusx
    -   Remove emmitter.maxListener warnings
    -   Upgraded ssh2 dependency from 0.5.5 to 0.6.1
    -   Enhanced error messages to provide more context and to be more consistent
    -   re-factored test
    -   Added new 'exists' method and re-factored mkdir/rmdir


<a id="org8f8109d"></a>

## V2.3.0

-   add: \`stat\` method
-   add \`fastGet\` and \`fastPut\` method.
-   fix: \`mkdir\` file exists decision logic


<a id="org71babc3"></a>

## V3.0.0 &#x2013; deprecate this version

-   change: \`sftp.get\` will return chunk not stream anymore
-   fix: get readable not emitting data events in node 10.0.0


<a id="orgf4ae2b5"></a>

## V2.1.1

-   add: event listener. [doc](<https://github.com/jyu213/ssh2-sftp-client#Event>)
-   add: \`get\` or \`put\` method add extra options [pr#52](<https://github.com/jyu213/ssh2-sftp-client/pull/52>)


<a id="orgf9a5f29"></a>

## V2.0.1

-   add: \`chmod\` method [pr#33](<https://github.com/jyu213/ssh2-sftp-client/pull/33>)
-   update: upgrade ssh2 to V0.5.0 [pr#30](<https://github.com/jyu213/ssh2-sftp-client/pull/30>)
-   fix: get method stream error reject unwork [#22](<https://github.com/jyu213/ssh2-sftp-client/issues/22>)
-   fix: return Error object on promise rejection [pr#20](<https://github.com/jyu213/ssh2-sftp-client/pull/20>)


<a id="orgc156504"></a>

## V1.1.0

-   fix: add encoding control support for binary stream


<a id="orgf0aa6bc"></a>

## V1.0.5:

-   fix: multi image upload
-   change: remove \`this.client.sftp\` to \`connect\` function


<a id="orgcb2577e"></a>

# Logging Issues

Please log an issue for all bugs, questions, feature and enhancement
requests. Please ensure you include the module version, node version and
platform. 


<a id="org6a44eb7"></a>

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


<a id="org8002dc9"></a>

# Contributors

This module was initially written by jyu213. On August 23rd, 2019, theophilusx
took over responsibility for maintaining this module. A number of other people
have contributed to this module, but until now, this was not tracked. My
intention is to credit anyone who contributes going forward. 

-   **jyu213:** Original author
-   **theophilusx:** Current maintainer

