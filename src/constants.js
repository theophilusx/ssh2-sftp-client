'use strict';

const errorCode = {
  generic: 'ERR_GENERIC_CLIENT',
  connect: 'ERR_NOT_CONNECTED',
  badPath: 'ERR_BAD_PATH',
  permission: 'EACCES',
  notexist: 'ENOENT'
};

module.exports = {
  errorCode
};
