import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { checkFolderExists } from '../util';
import { getStorage } from './storage';

export const readdirModelImagesIpc = async (
  event: IpcMainInvokeEvent,
  model: string
) => {
  const settings = await getStorage('read', 'settings');

  if (settings !== null) {
    const { checkpointsPath } = settings;

    const folderPath = `${checkpointsPath}\\${model}`;

    const folderExists = await checkFolderExists(folderPath);

    if (folderExists) {
      const images = fs.readdirSync(folderPath);
      return images.map((f) => `${folderPath}\\${f}`);
    }
  }

  return [];
};
