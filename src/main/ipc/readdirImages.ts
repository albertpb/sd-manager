import { IpcMainInvokeEvent, app } from 'electron';
import fs from 'fs';
import { checkFileExists, checkFolderExists } from '../util';

export const readdirImagesIpc = async (
  event: IpcMainInvokeEvent,
  modelName: string
) => {
  const settingsFilePath = `${app.getPath('userData')}\\storage.json`;
  const settingsExists = await checkFileExists(settingsFilePath);
  if (settingsExists) {
    const { settings } = JSON.parse(
      fs.readFileSync(settingsFilePath, { encoding: 'utf-8' })
    );
    const { imagesDestPath } = settings;

    const imagesPath = `${imagesDestPath}\\${modelName}`;
    const imagesDataPath = `${imagesPath}\\data.json`;

    const folderExists = await checkFolderExists(imagesPath);
    const imagesDataExists = await checkFileExists(imagesDataPath);

    if (folderExists) {
      const files = fs.readdirSync(imagesPath);

      if (imagesDataExists) {
        const imagesData = JSON.parse(
          fs.readFileSync(imagesDataPath, { encoding: 'utf-8' })
        );

        return files
          .filter((f) => f.match(/.thumbnail.png/g))
          .sort((a, b) => {
            const fa = a.replace(/.thumbnail.png/g, '');
            const fb = b.replace(/.thumbnail.png/g, '');
            if (imagesData[fa].rating < imagesData[fb].rating) return 1;
            if (imagesData[fa].rating > imagesData[fb].rating) return -1;

            return 0;
          })
          .map((f) => `${imagesPath}\\${f}`);
      }

      return files
        .filter((f) => f.match(/.thumbnail.png/g))
        .map((f) => `${imagesPath}\\${f}`);
    }
  }

  return [];
};
