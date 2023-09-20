import { IpcMainInvokeEvent, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';
import { checkFolderExists } from '../util';

export const saveImageFromClipboard = async (
  event: IpcMainInvokeEvent,
  filePath: string
) => {
  const dir = path.dirname(filePath);
  const dirExists = await checkFolderExists(dir);

  if (!dirExists) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data = clipboard.readImage('clipboard').toPNG();

  fs.writeFileSync(filePath, data);
};
