import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { checkFileExists, checkFolderExists } from '../util';
import {
  ImageMetaData,
  extractMetadata,
  parseAutomatic1111Meta,
  parseComfyUiMeta,
} from '../exif';

export const organizeImagesIpc = async (
  browserWindow: BrowserWindow | null
) => {
  const userDataPath = `${app.getPath('userData')}`;
  const settingsPathFile = `${userDataPath}\\storage.json`;

  const settingsPathExists = await checkFileExists(settingsPathFile);
  if (!settingsPathExists) return;

  const storage = fs.readFileSync(settingsPathFile, { encoding: 'utf-8' });
  const { settings } = JSON.parse(storage);
  const imagesSrcPath = settings.imagesPath;

  const documentsAppPath = `${app.getPath('documents')}\\sd-manager`;
  const imagesDestPath = `${documentsAppPath}\\images`;
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
  let imagesDB: Record<string, any> = {};
  const imagesDBPath = `${documentsAppPath}\\images.json`;

  for (let i = 0; i < files.length; i++) {
    const fileName = path.basename(files[i]);
    const ext = fileName.split('.').pop();
    const file = fs.readFileSync(files[i]);
    const exif = extractMetadata(file);

    if (ext === 'png') {
      const imagesDBFileExists = await checkFileExists(imagesDBPath);
      if (imagesDBFileExists) {
        imagesDB = JSON.parse(
          fs.readFileSync(imagesDBPath, { encoding: 'utf-8' })
        );
      } else {
        imagesDB = {};
      }

      let metadata: ImageMetaData | null = null;
      if (exif.parameters) {
        metadata = parseAutomatic1111Meta(exif.parameters);
      } else if (exif.workflow) {
        metadata = parseComfyUiMeta(exif.workflow);
      }

      if (metadata && metadata.model) {
        metadata.generatedBy = 'automatic1111';
        const modelImagesPath = `${imagesDestPath}\\${metadata.model}`;
        const modelFolderExists = await checkFolderExists(modelImagesPath);
        if (!modelFolderExists) {
          fs.mkdirSync(modelImagesPath);
        }
        const imageDestPath = `${modelImagesPath}\\${fileName}`;
        fs.copyFileSync(files[i], imageDestPath);

        if (!imagesDB[metadata.model]) imagesDB[metadata.model] = {};
        if (!imagesDB[metadata.model][fileName]) {
          imagesDB[metadata.model][fileName] = {
            path: imageDestPath,
            rating: 0,
            markdown: '',
          };
        }
      }

      if (browserWindow !== null) {
        const progress = ((i + 1) / files.length) * 100;
        const msg = `${files[i]}`;
        browserWindow.webContents.send('images-progress', msg, progress);
      }
    }
  }

  fs.writeFileSync(imagesDBPath, JSON.stringify(imagesDB, null, 2), {
    encoding: 'utf-8',
  });
};
