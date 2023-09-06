import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import SqliteDB from '../db';
import {
  calculateHashFile,
  checkFileExists,
  checkFolderExists,
  getFileNameExt,
  getFilenameNoExt,
} from '../util';
import { extractMetadata, parseImageSdMeta } from '../exif';
import { settingsDB } from './settings';

export type ImageRow = {
  hash: string;
  path: string;
  rating: number;
  model: string;
  generatedBy: string;
  sourcePath: string;
  name: string;
};

export const organizeImagesIpc = async (
  browserWindow: BrowserWindow | null
) => {
  const settings = await settingsDB('readAll');

  const imagesSrcPath = settings.imagesPath;
  const imagesDestPath = settings.imagesDestPath;

  const folderExists = await checkFolderExists(imagesDestPath);

  const db = await SqliteDB.getInstance().getdb();
  const imagesRows: ImageRow[] = await db.all(`SELECT * FROM images`);
  const imagesRowsHashMap = imagesRows.reduce(
    (acc: Record<string, ImageRow>, row) => {
      acc[row.hash] = row;
      return acc;
    },
    {}
  );

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
        const imageHash = await calculateHashFile(files[i]);

        if (!imagesRowsHashMap[imageHash]) {
          try {
            fs.copyFileSync(
              files[i],
              imageDestPath,
              fs.constants.COPYFILE_EXCL
            );
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

          await db.run(
            `INSERT INTO images(hash, path, rating, model, generatedBy, sourcePath, name) VALUES($hash, $path, $rating, $model, $generatedBy, $sourcePath, $name)`,
            {
              $hash: imageHash,
              $path: imageDestPath,
              $rating: 1,
              $model: metadata.model,
              $generatedBy: metadata.generatedBy,
              $sourcePath: files[i],
              $name: fileNameNoExt,
            }
          );
        }
      }

      if (browserWindow !== null) {
        const progress = ((i + 1) / files.length) * 100;
        const msg = `${files[i]}`;
        browserWindow.webContents.send('images-progress', msg, progress);
      }
    }
  }
};
