import fs from 'fs';
import { IpcMainInvokeEvent, app } from 'electron';
import { checkFileExists, checkFolderExists, getFilenameNoExt } from '../util';

export const saveMD = async (
  event: IpcMainInvokeEvent,
  model: string,
  imageFileName: string,
  textMD: string
) => {
  console.log('saving markdown', model, imageFileName);

  const settingsFilePath = `${app.getPath('userData')}\\storage.json`;
  const settingsExists = await checkFileExists(settingsFilePath);
  if (settingsExists) {
    const { settings } = JSON.parse(
      fs.readFileSync(settingsFilePath, { encoding: 'utf-8' })
    );
    const { imagesDestPath } = settings;

    const imageFileNameNoExt = getFilenameNoExt(imageFileName);
    const destFolderPath = `${imagesDestPath}\\${model}\\${imageFileNameNoExt}`;

    const destPathExists = await checkFolderExists(destFolderPath);
    if (!destPathExists) {
      fs.mkdirSync(destFolderPath);
    }

    fs.writeFileSync(`${destFolderPath}\\markdown.md`, textMD, {
      encoding: 'utf-8',
    });
  }
};
