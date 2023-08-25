import fs from 'fs';
import { IpcMainInvokeEvent, app } from 'electron';
import { checkFileExists, getFilenameNoExt } from '../util';

export const saveImageJson = async (
  event: IpcMainInvokeEvent,
  model: string,
  imageFileName: string,
  data: Record<string, any>
) => {
  console.log('saving image json', model, imageFileName);

  const settingsFilePath = `${app.getPath('userData')}\\storage.json`;
  const settingsExists = await checkFileExists(settingsFilePath);
  if (settingsExists) {
    const { settings } = JSON.parse(
      fs.readFileSync(settingsFilePath, { encoding: 'utf-8' })
    );
    const { imagesDestPath } = settings;

    const imageFileNameNoExt = getFilenameNoExt(imageFileName);
    const jsonFilePath = `${imagesDestPath}\\${model}\\data.json`;

    let jsonContent = {};
    try {
      const jsonFile = fs.readFileSync(jsonFilePath, { encoding: 'utf-8' });
      jsonContent = JSON.parse(jsonFile);
    } catch (error) {
      console.log('json file not exists');
    }

    jsonContent = {
      ...jsonContent,
      [imageFileNameNoExt]: data,
    };

    fs.writeFileSync(`${jsonFilePath}`, JSON.stringify(jsonContent), {
      encoding: 'utf-8',
    });
  }
};
