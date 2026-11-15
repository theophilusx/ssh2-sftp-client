import { Readable, Writable } from 'node:stream';
import SftpClient from 'ssh2-sftp-client';
import type { FileInfo, FileStats, ListFilter } from 'ssh2-sftp-client';

async function main(): Promise<void> {
  const client = new SftpClient('test', {
    error: (err: Error) => console.error(err.message),
    end: () => {},
    close: () => {},
  });
  const sftp = await client.connect({ host: 'h', port: 22, username: 'u', password: 'p' });
  sftp.end();

  const real: string = await client.realPath('.');
  const cwd: string = await client.cwd();
  const st: FileStats = await client.stat('/a');
  const lst: FileStats = await client.lstat('/a');
  const isDir: boolean = st.isDirectory && lst.isSymbolicLink;
  const ex: false | 'd' | '-' | 'l' = await client.exists('/a');

  const filter: ListFilter = (item: FileInfo) => item.type === 'd' && item.rights.user.includes('r');
  const files: FileInfo[] = await client.list('/a', filter);
  await client.list('/a');

  const out: string | Writable | Buffer = await client.get('/a', undefined, { readStreamOptions: { encoding: null } });
  await client.get('/a', '/local/a');
  await client.get('/a', new Writable());
  await client.fastGet('/a', '/local/a', { concurrency: 32, step: () => {} });
  await client.fastPut('/local/a', '/a', { chunkSize: 32768 });
  await client.put('/local/a', '/a');
  await client.put(Buffer.from('x'), '/a', { writeStreamOptions: { mode: 0o644 } });
  await client.put(new Readable(), '/a');
  await client.append(Buffer.from('x'), '/a');
  await client.mkdir('/a', true);
  await client.rmdir('/a', true);
  await client.delete('/a', true);
  await client.rename('/a', '/b');
  await client.posixRename('/a', '/b');
  await client.chmod('/a', 0o755);
  await client.chmod('/a', '755');
  const up: string = await client.uploadDir('/l', '/r', {
    filter: (path: string, isDir: boolean) => !isDir && path.endsWith('.txt'),
    useFastput: true,
  });
  await client.downloadDir('/r', '/l', { useFastget: true });
  const rs: Readable = client.createReadStream('/a', { start: 0 });
  const ws: Writable = client.createWriteStream('/a');
  const cp: string = await client.rcopy('/a', '/b');
  client.on('error', (e: Error) => console.error(e));
  client.removeListener('error', () => {});
  const ended: boolean = await client.end();

  // @ts-expect-error path must be a string
  await client.mkdir(42);
  // @ts-expect-error unknown method
  client.nope();

  void [real, cwd, isDir, ex, files, out, up, rs, ws, cp, ended];
}
void main;

async function getOverloads(client: SftpClient): Promise<void> {
  const noDst: Buffer = await client.get('/a');
  const toPath: string = await client.get('/a', '/local/a');
  const toStream: Writable = await client.get('/a', new Writable());
  void [noDst, toPath, toStream];
}
void getOverloads;
