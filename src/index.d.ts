type Stats = {
  /** Integer representing type and permissions */
  mode: string;
  /** User ID */
  uid: number;
  /** Group ID */
  gid: number;
  /** File size */
  size: number;
  /** Last access time in milliseconds */
  accessTime: number;
  /** Last modify time in milliseconds */
  modifyTime: number;
  /** True if the object is a directory */
  isDirectory: boolean;
  /** True if the object is a file */
  isFile: boolean;
  /** True if the object is a block device */
  isBlockDevice: boolean;
  /** True if the object is a character device */
  isCharacterDevice: boolean;
  /** True if the object is a symbolic link */
  isSymbolicLink: boolean;
  /** True if the object is a FIFO */
  isFIFO: boolean;
  /** True if the object is a socket */
  isSocket: boolean;
};