import path from 'path';
import fs from 'fs';
import { IpcMainInvokeEvent, app } from 'electron';
import { checkFileExists, checkFolderExists, getFilenameNoExt } from '../util';

export const fileAttach = async (
  event: IpcMainInvokeEvent,
  model: string,
  imageFileName: string,
  filePath: string
) => {
  const settingsFilePath = `${app.getPath('userData')}\\storage.json`;
  const settingsExists = await checkFileExists(settingsFilePath);
  if (settingsExists) {
    const { settings } = JSON.parse(
      fs.readFileSync(settingsFilePath, { encoding: 'utf-8' })
    );
    const { imagesDestPath } = settings;
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
  }

  return null;
};
