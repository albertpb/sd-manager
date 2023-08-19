import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { extractMetadata } from '../exif';

export const readFileIpc = async (
  event: IpcMainInvokeEvent,
  path: string,
  encoding: BufferEncoding
) => {
  const buffer = fs.readFileSync(path, { encoding });

  return buffer;
};

export const readImageIpc = async (event: IpcMainInvokeEvent, path: string) => {
  const buffer = fs.readFileSync(path);
  const exif = extractMetadata(buffer);
  const base64 = Buffer.from(buffer).toString('base64');

  return {
    base64,
    exif,
  };
};
