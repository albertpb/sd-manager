import path from 'path';
import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { checkFolderExists, getFilenameNoExt } from '../util';
import { settingsDB } from './settings';

export const fileAttach = async (
  event: IpcMainInvokeEvent,
  model: string,
  imageFileName: string,
  filePath: string
) => {
  const imagesDestPath = await settingsDB('read', 'imagesDestPath');

  if (imagesDestPath) {
    const imageFileNameNoExt = getFilenameNoExt(imageFileName);
    const destFolderPath = `${imagesDestPath}\\${model}\\${imageFileNameNoExt}`;

    const destPathExists = await checkFolderExists(destFolderPath);
    if (!destPathExists) {
      fs.mkdirSync(destFolderPath);
    }

    const fileName = path.basename(filePath);
    const destFilePath = `${destFolderPath}\\${fileName}`;

    fs.copyFileSync(filePath, destFilePath);
    return destFilePath;
  }

  return null;
};
