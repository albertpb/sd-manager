import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { checkFolderExists, getFilenameNoExt } from '../util';
import { settingsDB } from './settings';

export const saveMD = async (
  event: IpcMainInvokeEvent,
  model: string,
  imageFileName: string,
  textMD: string
) => {
  console.log('saving markdown', model, imageFileName);

  const imagesDestPath = await settingsDB('read', 'imagesDestPath');
  const imageFileNameNoExt = getFilenameNoExt(imageFileName);
  const destFolderPath = `${imagesDestPath}\\${model}\\${imageFileNameNoExt}`;

  const destPathExists = await checkFolderExists(destFolderPath);
  if (!destPathExists) {
    fs.mkdirSync(destFolderPath);
  }

  fs.writeFileSync(`${destFolderPath}\\markdown.md`, textMD, {
    encoding: 'utf-8',
  });
};
