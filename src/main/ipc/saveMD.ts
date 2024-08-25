import fs from 'fs';
import path from 'path';
import os from 'os';
import { IpcMainInvokeEvent, clipboard } from 'electron';
import { convertPath } from '../../renderer/utils';
import { checkFolderExists } from '../util';

export const saveMDIpc = async (
  event: IpcMainInvokeEvent,
  pathDir: string,
  textMD: string,
) => {
  const destPathExists = await checkFolderExists(pathDir);
  if (!destPathExists) {
    await fs.promises.mkdir(pathDir);
  }

  await fs.promises.writeFile(
    convertPath(`${pathDir}\\markdown.md`, os.platform()),
    textMD,
    {
      encoding: 'utf-8',
    },
  );
};

export const saveImageMDIpc = async (
  event: IpcMainInvokeEvent,
  source: string,
  dest: string,
) => {
  const dir = path.dirname(dest);
  const dirExists = await checkFolderExists(dir);

  if (!dirExists) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  await fs.promises.copyFile(source, dest);
};

export const saveImageFromClipboardIpc = async (
  event: IpcMainInvokeEvent,
  filePath: string,
) => {
  const dir = path.dirname(filePath);
  const dirExists = await checkFolderExists(dir);

  if (!dirExists) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  const data = clipboard.readImage('clipboard').toPNG();

  await fs.promises.writeFile(filePath, data);
};
