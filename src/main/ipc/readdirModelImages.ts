import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { checkFolderExists } from '../util';

export const readdirModelImagesIpc = async (
  event: IpcMainInvokeEvent,
  model: string,
  modelsPath: string
) => {
  const folderPath = `${modelsPath}\\${model}`;

  const folderExists = await checkFolderExists(folderPath);

  if (folderExists) {
    const images = fs.readdirSync(folderPath);
    return images.map((f) => `${folderPath}\\${f}`);
  }

  return [];
};
