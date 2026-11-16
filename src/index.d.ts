import type { Readable, ReadableOptions, Writable, WritableOptions } from 'node:stream';
import type {
  Client,
  ConnectConfig,
  ReadStream,
  ReadStreamOptions,
  SFTPWrapper,
  TransferOptions,
  WriteStream,
  WriteStreamOptions,
} from 'ssh2';

/** Connection options: everything `ssh2` accepts plus the options added by this module. */
export interface SftpConnectConfig extends ConnectConfig {
  /** Maximum number of concurrent promises used by uploadDir()/downloadDir(). Default 10. */
  promiseLimit?: number;
}

/** Payload of the 'upload' and 'download' events emitted by uploadDir()/downloadDir(). */
export interface TransferEvent {
  source: string;
  destination: string;
}

export interface FileRights {
  user: string;
  group: string;
  other: string;
}

/** Entry returned by list(). Times are in milliseconds since the epoch. */
export interface FileInfo {
  type: string;
  name: string;
  size: number;
  modifyTime: number;
  accessTime: number;
  rights: FileRights;
  owner: number;
  group: number;
  longname: string;
}

/** Attributes returned by stat() and lstat(). Times are in milliseconds since the epoch. */
export interface FileStats {
  mode: number;
  uid: number;
  gid: number;
  size: number;
  accessTime: number;
  modifyTime: number;
  isDirectory: boolean;
  isFile: boolean;
  isBlockDevice: boolean;
  isCharacterDevice: boolean;
  isSymbolicLink: boolean;
  isFIFO: boolean;
  isSocket: boolean;
}

export type ListFilter = (item: FileInfo) => boolean;

/** Callback for the filter option of uploadDir()/downloadDir(). */
export type DirFilter = (path: string, isDirectory: boolean) => boolean;

/** Read stream options; `encoding: null` is accepted and returns raw Buffers. */
export type SftpReadStreamOptions = Omit<ReadStreamOptions, 'encoding'> & {
  encoding?: BufferEncoding | null;
};

/** Options passed to Readable.pipe(). */
export interface PipeOptions {
  end?: boolean;
}

export interface GetOptions {
  readStreamOptions?: SftpReadStreamOptions;
  writeStreamOptions?: WritableOptions & { flags?: string; mode?: number };
  pipeOptions?: PipeOptions;
}

export interface PutOptions {
  readStreamOptions?: ReadableOptions & { flags?: string; mode?: number };
  writeStreamOptions?: WriteStreamOptions;
  pipeOptions?: PipeOptions;
}

export type AppendOptions = WriteStreamOptions;

export interface UploadDirOptions {
  filter?: DirFilter | null;
  useFastput?: boolean;
}

export interface DownloadDirOptions {
  filter?: DirFilter | null;
  useFastget?: boolean;
}

export interface GlobalCallbacks {
  error?: (err: Error) => void;
  end?: () => void;
  close?: () => void;
}

/** Errors raised by this module carry a string `code` and `custom: true`. */
export interface SftpError extends Error {
  code: string;
  custom: true;
}

export type ExistsResult = false | 'd' | '-' | 'l';

declare class SftpClient {
  /** Module version, taken from package.json. */
  version: string;
  /** Name used to label debug messages. */
  clientName: string;
  /** The underlying ssh2 client. */
  client: Client;
  /** The ssh2 SFTP subsystem; undefined until connect() succeeds and after end(). */
  sftp: SFTPWrapper | undefined;
  /** Remote platform, 'unix' by default. */
  remotePlatform: string;
  /** Maximum concurrent operations for uploadDir()/downloadDir(). Default 10. */
  promiseLimit: number;

  constructor(clientName?: string, callbacks?: GlobalCallbacks);

  connect(config: SftpConnectConfig): Promise<SFTPWrapper>;
  end(): Promise<boolean>;

  on(eventType: 'upload' | 'download', callback: (info: TransferEvent) => void): void;
  on(eventType: string, callback: (...args: any[]) => void): void;
  removeListener(eventType: string, callback: (...args: any[]) => void): void;

  realPath(remotePath: string): Promise<string>;
  cwd(): Promise<string>;
  stat(remotePath: string): Promise<FileStats>;
  lstat(remotePath: string): Promise<FileStats>;
  exists(remotePath: string): Promise<ExistsResult>;
  list(remotePath: string, filter?: ListFilter): Promise<FileInfo[]>;

  get(remotePath: string, dst?: undefined, options?: GetOptions): Promise<Buffer>;
  get(remotePath: string, dst: string, options?: GetOptions): Promise<string>;
  get(remotePath: string, dst: Writable, options?: GetOptions): Promise<Writable>;
  get(remotePath: string, dst?: string | Writable, options?: GetOptions): Promise<string | Writable | Buffer>;
  fastGet(remotePath: string, localPath: string, options?: TransferOptions): Promise<string>;
  fastPut(localPath: string, remotePath: string, options?: TransferOptions): Promise<string>;
  put(input: string | Buffer | Readable, remotePath: string, options?: PutOptions): Promise<string>;
  append(input: Buffer | Readable, remotePath: string, options?: AppendOptions): Promise<string>;

  mkdir(remotePath: string, recursive?: boolean): Promise<string>;
  rmdir(remotePath: string, recursive?: boolean): Promise<string>;
  delete(remotePath: string, notFoundOK?: boolean): Promise<string>;
  rename(fromPath: string, toPath: string): Promise<string>;
  posixRename(fromPath: string, toPath: string): Promise<string>;
  chmod(remotePath: string, mode: number | string): Promise<string>;
  rcopy(srcPath: string, dstPath: string): Promise<string>;

  uploadDir(srcDir: string, dstDir: string, options?: UploadDirOptions): Promise<string>;
  downloadDir(srcDir: string, dstDir: string, options?: DownloadDirOptions): Promise<string>;

  createReadStream(remotePath: string, options?: ReadStreamOptions): ReadStream;
  createWriteStream(remotePath: string, options?: WriteStreamOptions): WriteStream;
}

export default SftpClient;
// The JS entry point also exports the class as 'module.exports', so CommonJS
// consumers (and `import X = require()` in TypeScript) get the class itself.
export { SftpClient as 'module.exports' };
