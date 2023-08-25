import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  checkFileExists,
  checkFolderExists,
  getFileNameExt,
  getFilenameNoExt,
} from '../util';
import { extractMetadata, parseImageSdMeta } from '../exif';

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
  const imagesDestPath = settings.imagesDestPath;

  const folderExists = await checkFolderExists(imagesDestPath);

  if (!folderExists) {
    fs.mkdirSync(imagesDestPath, {
      recursive: true,
    });
  }

  const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (fs.statSync(`${dirPath}\\${file}`).isDirectory()) {
        arrayOfFiles = getAllFiles(`${dirPath}\\${file}`, arrayOfFiles);
      } else {
        arrayOfFiles.push(`${dirPath}\\${file}`);
      }
    });

    return arrayOfFiles;
  };

  const files = getAllFiles(imagesSrcPath);

  const imagesData: Record<string, any> = {};

  for (let i = 0; i < files.length; i++) {
    const fileName = path.basename(files[i]);
    const fileNameNoExt = getFilenameNoExt(fileName);
    const ext = getFileNameExt(fileName);
    const file = fs.readFileSync(files[i]);
    const exif = extractMetadata(file);

    if (ext === 'png') {
      const metadata = parseImageSdMeta(exif);

      if (metadata && metadata.model) {
        metadata.generatedBy = 'automatic1111';
        const modelImagesPath = `${imagesDestPath}\\${metadata.model}`;
        const modelFolderExists = await checkFolderExists(modelImagesPath);
        if (!modelFolderExists) {
          fs.mkdirSync(modelImagesPath);
        }

        const imageDestPath = `${modelImagesPath}\\${fileName}`;
        try {
          fs.copyFileSync(files[i], imageDestPath, fs.constants.COPYFILE_EXCL);
        } catch (error) {
          console.log(`${imageDestPath} already exists`);
        }

        const imageFile = fs.readFileSync(files[i]);
        const thumbnailDestPath = `${modelImagesPath}\\${fileNameNoExt}.thumbnail.png`;
        const thumbnailExists = await checkFileExists(thumbnailDestPath);
        if (!thumbnailExists) {
          await sharp(imageFile)
            .resize({ height: 400 })
            .withMetadata()
            .toFile(thumbnailDestPath);
        }

        if (!imagesData[metadata.model]) {
          const jsonDestPath = `${modelImagesPath}\\data.json`;
          const jsonFileExits = await checkFileExists(jsonDestPath);
          if (jsonFileExits) {
            const jsonFile = JSON.parse(
              fs.readFileSync(jsonDestPath, { encoding: 'utf-8' })
            );
            imagesData[metadata.model] = jsonFile;
          } else {
            imagesData[metadata.model] = {};
          }
        }

        if (!imagesData[metadata.model][fileNameNoExt]) {
          imagesData[metadata.model][fileNameNoExt] = {
            rating: 1,
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

  const imagesDataEntries = Object.entries(imagesData);
  for (let i = 0; i < imagesDataEntries.length; i++) {
    const [model, data] = imagesDataEntries[i];
    const jsonDestPath = `${imagesDestPath}\\${model}\\data.json`;
    fs.writeFileSync(jsonDestPath, JSON.stringify(data, null, 2), {
      encoding: 'utf-8',
    });
  }
};
