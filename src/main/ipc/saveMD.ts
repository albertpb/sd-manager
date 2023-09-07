import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { checkFolderExists } from '../util';

export const saveMD = async (
  event: IpcMainInvokeEvent,
  path: string,
  textMD: string
) => {
  const destPathExists = await checkFolderExists(path);
  if (!destPathExists) {
    fs.mkdirSync(path);
  }

  fs.writeFileSync(`${path}\\markdown.md`, textMD, {
    encoding: 'utf-8',
  });
};
