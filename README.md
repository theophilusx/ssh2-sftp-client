
# Table of Contents

1.  [SSH2 SFTP Client](#orge02c279)
2.  [Installation](#org60c7159)
3.  [Basic Usage](#orgec8a1e7)
4.  [Breaking Changes in Version 4.0.0](#orgb760d75)
5.  [Documentation](#orgc798645)
    1.  [Methods](#orgff23159)
        1.  [connect(config) ===> SFTPstream](#org032a80d)
        2.  [list(path, pattern) ==> Array[object]](#org6cf24f1)
        3.  [exists(path) ==> boolean](#org6afccbd)
        4.  [stat(path) ==> object](#org25c4ed3)
        5.  [Get](#orga44cfc6)
        6.  [FastGet](#org73155a6)
        7.  [Put](#org89e8e3d)
        8.  [FastPut](#orgdbc979d)
        9.  [Mkdir](#orge08dbc1)
        10. [Rmdir](#org1a30d81)
        11. [Delete](#org868e33a)
        12. [Rename](#org768b982)
        13. [Chmod](#orgeb54003)
        14. [end](#org68d8a18)
6.  [FAQ](#orgc013f6d)
    1.  [How can you pass writable stream as dst for get method?](#orgae0c658)
    2.  [How can I upload files without having to specify a password?](#org85bf9f3)
7.  [Change Log](#orgc8fc979)
    1.  [v4.0.0 (Current development version)](#org725f968)
    2.  [V2.5.2 (Current stable version)](#orgf76ab47)
    3.  [V2.5.1](#org9fc365a)
    4.  [V2.5.0](#orgc8269e8)
    5.  [V2.4.3](#orga90fca4)
    6.  [V2.4.2](#org0cea0da)
    7.  [V2.4.1](#orgf67d7a7)
    8.  [V2.4.0](#orgae4abb0)
    9.  [V2.3.0](#orgd06a022)
    10. [V3.0.0 &#x2013; deprecate this version](#org644d0aa)
    11. [V2.1.1](#org14688d0)
    12. [V2.0.1](#orgba19104)
    13. [V1.1.0](#org9395f24)
    14. [V1.0.5:](#org43cdaeb)
8.  [Logging Issues](#orgb99b575)
9.  [Pull Requests](#org65735b6)
10. [Contributors](#orga4aa3e5)


<a id="orge02c279"></a>

# SSH2 SFTP Client

an SFTP client for node.js, a wrapper around [SSH2](https://github.com/mscdex/ssh2)  which provides a high level
convenience abstraction as well as a Promise based API.

Documentation on the methods and available options in the underlying modules can
be found on the [SSH2](https://github.com/mscdex/ssh2) and [SSH2-STREAMS](https://github.com/mscdex/ssh2-streams) project pages.

Current stable release is **v2.5.2**

Current development version is **v4.0.0** and is in the **release-4.0.0** branch of
the repository.


<a id="org60c7159"></a>

# Installation

    npm install ssh2-sftp-client


<a id="orgec8a1e7"></a>

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


<a id="orgb760d75"></a>

# Breaking Changes in Version 4.0.0

There has been minor changes to the API signatures

-   The `connect()` method no longer accepts a 'connectMethod' argument. It was
    not clear what this argument was for or what it did.

-   Additional options are now available in the configure object passed to the
    `connect()` method to control the connection retry functionality.

-   Node versions before 8.x are no longer supported.

-   Error message formats have changed. While they are now more consistent, if you
    have code which parses the messages, it will need to be updated.

-   The `auxList()` method is deprecated. An additional optional `pattern`
    argument has been added to the `list()` method to facilitate filtering of
    results returned by `list()`. Both 'glob' and regexp pattern styles are
    supported.

-   The properties returned by the `stat()` method have changed. The `permissions`
    property has been removed as it contained the same information as the `mode`
    property. New properties `isDirectory`, `isFile`, `isBlockDevice`,
    `isCharacterDevice`, `isSymbolicLink`, `isFIFO` and `isSocket` have been added.


<a id="orgc798645"></a>

# Documentation

The connection options are the same as those offered by the underlying SSH2
module. For full details, please see [SSH2 client methods](https://github.com/mscdex/ssh2#user-content-client-methods)

All the methods will return a Promise;


<a id="orgff23159"></a>

## Methods


<a id="org032a80d"></a>

### connect(config) ===> SFTPstream

Connect to an sftp server. Full documentation for connection options is
available [here](https://github.com/mscdex/ssh2#user-content-client-methods)

1.  Connection Options

    This module is based on the excellent [SSH2](https://github.com/mscdex/ssh2#client) module. That module is a general SSH2
    client and server library and provides much more functionality than just SFTP
    connectivity. Many of the connect options provided by that module are less
    relevant for SFTP connections. It is recommended you keep the config options to
    the minimum needed and stick to the options listed in the `commonOpts` below. 
    
    The `retries`, `retry_factor` and `retry_minTimeout` options are not part of the
    SSH2 module. These are part of the configuration for the [retry](https://www.npmjs.com/package/retry) package and what
    is used to enable retrying of sftp connection attempts. See the documentation
    for that package for an explanation of these values.  
    
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
          passphrase; 'a pass phrase', // string - For an encrypted private key
          readyTimeout: 20000, // integer How long (in ms) to wait for the SSH handshake
          strictVendor: true // boolean - Performs a strict server vendor check
          debug: myDebug // function - Set this to a function that receives a single
                        // string argument to get detailed (local) debug information. 
          retries: 2 // integer. Number of times to retry connecting
          retry_factor: 2 // integer. Time factor used to calculate time between retries
          retry_minTimeout: 2000 // integer. Minimum timeout between attempts
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

2.  Example Use

        sftp.connect({
          host: example.com,
          port: 22,
          username: 'donald',
          password: 'youarefired'
        });


<a id="org6cf24f1"></a>

### list(path, pattern) ==> Array[object]

Retrieves a directory listing. This method returns a Promise, which once
realised, returns an array of objects representing items in the remote
directory. 

-   **path:** {String} Remote directory path
-   **pattern:** (optional) {string|RegExp} A pattern used to filter the items included in the returned
    array. Pattern can be a simple *glob* style string or a regular
    experession. Defaults to `/.*/`.

1.  Example Use

        const Client = require('ssh2-sftp-client');
        
        const config = {
          host: 'exmaple.com',
          port: 22,
          username: 'red-don',
          password: 'my-secret'
        };
        
        let sftp = new Client;
        
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

2.  Return Objects

    The objects in the array returned by `list()` have the following properties;
    
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

3.  Pattern Filter

    The filter options can be a regular expression (most powerful option) or a
    simple *glob* like string where \* will match any number of characters e.g
    
        foo* => foo, foobar, foobaz
        *bar => bar, foobar, tabbar
        *oo* => foo, foobar, look, book
    
    The *glob* style matching is very simple. In most cases, you are best off using
    a real regular expression which will allow you to do more powerful matching and
    anchor matches to the beginning/end of the string etc.


<a id="org6afccbd"></a>

### exists(path) ==> boolean

Tests to see if remote file or directory exists. Returns type of remote object
if it exists or false if it does not.

1.  Example Use

        const Client = require('ssh2-sftp-client');
        
        const config = {
          host: 'exmaple.com',
          port: 22,
          username: 'red-don',
          password: 'my-secret'
        };
        
        let sftp = new Client;
        
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


<a id="org25c4ed3"></a>

### stat(path) ==> object

Returns the attributes associated with the object pointed to by `path`. 

-   **path:** String. Remote path to directory or file on remote server

1.  Attributes

    The `stat()` method returns an object with the following properties;
    
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
          isCharcterDevice: false, // true if object is a character device
          isSymbolicLink: false, // true if object is a symbolic link
          isFIFO: false, // true if object is a FIFO
          isSocket: false // true if object is a socket
        };

2.  Example Use

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


<a id="orga44cfc6"></a>

### Get

Get a \`ReadableStream\` from remotePath. 

    sftp.get(remoteFilePath, [options]);


<a id="org73155a6"></a>

### FastGet

Downloads a file at remotePath to localPath using parallel reads for faster
throughput. Details on available options can be found [here](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) 

    sftp.fastGet(remotePath, localPath, [options]);


<a id="org89e8e3d"></a>

### Put

upload a file from \`localPath\` or \`Buffer\`, \`Stream\` data to
\`remoteFilePath\`. **Be sure to include the file name in remoteFilePath!**

    sftp.put(localFilePath, remoteFilePath, [optons]);
    sftp.put(Buffer, remoteFilePath, [options]);
    sftp.put(Stream, remoteFilePath, [options]);


<a id="orgdbc979d"></a>

### FastPut

Uploads a file from localPath to remotePath using parallel reads for faster
throughput. Details on available options are available [here](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) 

    sftp.fastPut(localPath, remotePath, [options]);


<a id="orge08dbc1"></a>

### Mkdir

Create a new directory. If the recursive flag is set to true, the method will
create any directories in the path which do not already exist. Recursive flag
defaults to false.

    // recursive default is false, if true, it will create directory recursive
    sftp.mkdir(remoteFilePath, recursive);


<a id="org1a30d81"></a>

### Rmdir

Remove a directory or file. If removing a directory and recursive flag is set to
`true`, the specified directory and all sub-directories and files will be
deleted. If set to false and the directory has sub-directories or files, the
action will fail. 

    // recursive default is false, if true, it will remove directory
    // recursive even if is not empty
    sftp.rmdir(localPath, recursive);


<a id="org868e33a"></a>

### Delete

Delete a file.

    sftp.delete(remoteFilePath);


<a id="org768b982"></a>

### Rename

Rename a file or directory.

    sftp.rename(remoteSourcePath, remoteDestPath);


<a id="orgeb54003"></a>

### Chmod

Change the mode (read, write or execute) of a remote file or directory.

    sftp.chmod(remoteDestPath, mode);


<a id="org68d8a18"></a>

### end

Close the sftp connection.

    sftp.end();


<a id="orgc013f6d"></a>

# FAQ


<a id="orgae0c658"></a>

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


<a id="org85bf9f3"></a>

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


<a id="orgc8fc979"></a>

# Change Log


<a id="org725f968"></a>

## v4.0.0 (Current development version)

-   Remove support for node < 8.x
-   Fix connection retry feature
-   sftp connection object set to null when 'end' signal is raised
-   Removed 'connectMethod' argument from connect method.
-   Refined adding/removing of listeners in connect() and end() methods to enable
    errors to be adequately caught and reported.
-   Depricate auxList() and add pattern/regexp filter option to list()
-   Refactored handling of event signals to provide better feedback to clients


<a id="orgf76ab47"></a>

## V2.5.2 (Current stable version)

-   Repository transferred to theophilusx
-   Fix error in package.json pointing to wrong repository


<a id="org9fc365a"></a>

## V2.5.1

-   Apply 4 pull requests to address minor issues prior to transfer


<a id="orgc8269e8"></a>

## V2.5.0

-   ???


<a id="orga90fca4"></a>

## V2.4.3

-   merge #108, #110
    -   fix connect promise if connection ends


<a id="org0cea0da"></a>

## V2.4.2

-   merge #105
    -   fix windows path


<a id="orgf67d7a7"></a>

## V2.4.1

-   merge pr #99, #100
    -   bug fix


<a id="orgae4abb0"></a>

## V2.4.0

-   Requires node.js v7.5.0 or above.
-   merge pr #97, thanks for @theophilusx
    -   Remove emmitter.maxListener warnings
    -   Upgraded ssh2 dependency from 0.5.5 to 0.6.1
    -   Enhanced error messages to provide more context and to be more consistent
    -   re-factored test
    -   Added new 'exists' method and re-factored mkdir/rmdir


<a id="orgd06a022"></a>

## V2.3.0

-   add: \`stat\` method
-   add \`fastGet\` and \`fastPut\` method.
-   fix: \`mkdir\` file exists decision logic


<a id="org644d0aa"></a>

## V3.0.0 &#x2013; deprecate this version

-   change: \`sftp.get\` will return chunk not stream anymore
-   fix: get readable not emitting data events in node 10.0.0


<a id="org14688d0"></a>

## V2.1.1

-   add: event listener. [doc](<https://github.com/jyu213/ssh2-sftp-client#Event>)
-   add: \`get\` or \`put\` method add extra options [pr#52](<https://github.com/jyu213/ssh2-sftp-client/pull/52>)


<a id="orgba19104"></a>

## V2.0.1

-   add: \`chmod\` method [pr#33](<https://github.com/jyu213/ssh2-sftp-client/pull/33>)
-   update: upgrade ssh2 to V0.5.0 [pr#30](<https://github.com/jyu213/ssh2-sftp-client/pull/30>)
-   fix: get method stream error reject unwork [#22](<https://github.com/jyu213/ssh2-sftp-client/issues/22>)
-   fix: return Error object on promise rejection [pr#20](<https://github.com/jyu213/ssh2-sftp-client/pull/20>)


<a id="org9395f24"></a>

## V1.1.0

-   fix: add encoding control support for binary stream


<a id="org43cdaeb"></a>

## V1.0.5:

-   fix: multi image upload
-   change: remove \`this.client.sftp\` to \`connect\` function


<a id="orgb99b575"></a>

# Logging Issues

Please log an issue for all bugs, questions, feature and enhancement
requests. Please ensure you include the module version, node version and
platform. 


<a id="org65735b6"></a>

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


<a id="orga4aa3e5"></a>

# Contributors

This module was initially written by jyu213. On August 23rd, 2019, theophilusx
took over responsibility for maintaining this module. A number of other people
have contributed to this module, but until now, this was not tracked. My
intention is to credit anyone who contributes going forward. 

-   **jyu213:** Original author
-   **theophilusx:** Current maintainer

