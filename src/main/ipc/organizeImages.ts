import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { checkFolderExists } from '../util';
import { extractMetadata, parseAutomatic1111Meta } from '../exif';

export const organizeImagesIpc = async (
  browserWindow: BrowserWindow | null
) => {
  const userDataPath = `${app.getPath('userData')}`;
  const settingsPathFile = `${userDataPath}\\storage.json`;
  const storage = fs.readFileSync(settingsPathFile, { encoding: 'utf-8' });
  const { settings } = JSON.parse(storage);
  const imagesSrcPath = settings.imagesPath;

  const imagesDestPath = `${app.getPath('documents')}\\sd-manager\\images`;
  const folderExists = await checkFolderExists(imagesDestPath);

  if (!folderExists) {
    fs.mkdirSync(imagesDestPath, {
      recursive: true,
    });
  }

  const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
        arrayOfFiles = getAllFiles(`${dirPath}/${file}`, arrayOfFiles);
      } else {
        arrayOfFiles.push(`${dirPath}/${file}`);
      }
    });

    return arrayOfFiles;
  };

  const files = getAllFiles(imagesSrcPath);

  for (let i = 0; i < files.length; i++) {
    const fileName = path.basename(files[i]);
    const file = fs.readFileSync(files[i]);
    const exif = extractMetadata(file);
    if (exif.parameters) {
      const metadata = parseAutomatic1111Meta(exif.parameters);
      if (metadata && metadata.Model) {
        const modelImagesPath = `${imagesDestPath}\\${metadata.Model}`;
        const modelFolderExists = await checkFolderExists(modelImagesPath);
        if (!modelFolderExists) {
          fs.mkdirSync(modelImagesPath);
        }
        fs.copyFileSync(files[i], `${modelImagesPath}\\${fileName}`);
      }
    }

    if (browserWindow !== null) {
      const progress = ((i + 1) / files.length) * 100;
      const msg = `${files[i]}`;
      browserWindow.webContents.send('images-progress', msg, progress);
    }
  }
};
