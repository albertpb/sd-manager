import path from 'path';
import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';

export const fileAttach = async (
  event: IpcMainInvokeEvent,
  filePath: string,
  imageFolder: string,
) => {
  console.log(filePath, imageFolder);

  const fileBaseName = path.basename(filePath);
  fs.copyFileSync(filePath, `${imageFolder}\\${fileBaseName}`);

  return `${imageFolder}\\${fileBaseName}`;
};
