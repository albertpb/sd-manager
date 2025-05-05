import path from 'path';
import fs from 'fs';
import os from 'os';
import { IpcMainInvokeEvent } from 'electron';
import { convertPath } from '../../renderer/utils';

export const fileAttach = async (
  event: IpcMainInvokeEvent,
  filePath: string,
  imageFolder: string,
) => {
  const fileBaseName = path.basename(filePath);
  await fs.promises.copyFile(
    convertPath(filePath, os.platform()),
    convertPath(`${imageFolder}\\${fileBaseName}`, os.platform()),
  );

  return convertPath(`${imageFolder}\\${fileBaseName}`, os.platform());
};
