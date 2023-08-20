import { IpcMainInvokeEvent, app } from 'electron';
import fs from 'fs';
import { checkFolderExists } from '../util';

export const readdirImagesIpc = async (
  event: IpcMainInvokeEvent,
  modelName: string
) => {
  const userDataPath = `${app.getPath('documents')}`;
  const imagesPath = `${userDataPath}\\sd-manager\\images\\${modelName}`;

  const folderExists = await checkFolderExists(imagesPath);

  if (folderExists) {
    const files = fs.readdirSync(imagesPath);

    return files.map((f) => `${imagesPath}\\${f}`);
  }

  return [];
};
