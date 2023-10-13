import fs from 'fs';
import path from 'path';
import { IpcMainInvokeEvent } from 'electron';
import { checkFolderExists } from '../util';

export const saveMDIpc = async (
  event: IpcMainInvokeEvent,
  pathDir: string,
  textMD: string
) => {
  const destPathExists = await checkFolderExists(pathDir);
  if (!destPathExists) {
    fs.mkdirSync(pathDir);
  }

  fs.writeFileSync(`${pathDir}\\markdown.md`, textMD, {
    encoding: 'utf-8',
  });
};

export const saveImageMDIpc = async (
  event: IpcMainInvokeEvent,
  source: string,
  dest: string
) => {
  const dir = path.dirname(dest);
  const dirExists = await checkFolderExists(dir);

  if (!dirExists) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.copyFileSync(source, dest);
};
