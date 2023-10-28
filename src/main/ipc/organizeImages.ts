import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createId } from '@paralleldrive/cuid2';
import SqliteDB from '../db';
import {
  calculateHashFile,
  checkFileExists,
  checkFolderExists,
  getAllFiles,
  getFileNameExt,
} from '../util';
import { extractMetadata, parseImageSdMeta } from '../exif';
import { settingsDB } from './settings';

export type ImageRow = {
  rowNum?: number;
  hash: string;
  path: string;
  rating: number;
  model: string;
  generatedBy: string;
  sourcePath: string;
  name: string;
  fileName: string;
  deleted: number;
};

export const organizeImagesIpc = async (
  browserWindow: BrowserWindow | null,
) => {
  const db = await SqliteDB.getInstance().getdb();

  const settings = await settingsDB('readAll');
  const foldersToWatch: { path: string }[] = await db.all(
    `SELECT * FROM watch_folders`,
  );

  const imagesDestPath = settings.imagesDestPath;

  const folderExists = await checkFolderExists(imagesDestPath);

  const imagesRows: ImageRow[] = await db.all(`SELECT * FROM images`);
  const imagesRowsHashMap = imagesRows.reduce(
    (acc: Record<string, ImageRow>, row) => {
      acc[row.hash] = row;
      return acc;
    },
    {},
  );

  if (!folderExists) {
    fs.mkdirSync(imagesDestPath, {
      recursive: true,
    });
  }

  const files = foldersToWatch
    .map((f) => f.path)
    .reduce((acc: string[], folder) => {
      acc = acc.concat(getAllFiles(folder));
      return acc;
    }, []);

  for (let i = 0; i < files.length; i++) {
    const fileNameNoExt = createId();
    const ext = getFileNameExt(path.basename(files[i]));
    const fileName = `${fileNameNoExt}.${ext}`;
    const file = fs.readFileSync(files[i]);
    const exif = extractMetadata(file);

    if (browserWindow !== null) {
      const progress = ((i + 1) / files.length) * 100;
      const msg = `${files[i]}`;
      browserWindow.webContents.send('images-progress', msg, progress);
    }

    if (ext === 'png') {
      const metadata = parseImageSdMeta(exif);

      if (metadata && metadata.model) {
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
              fs.constants.COPYFILE_EXCL,
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

          try {
            await db.run(
              `INSERT INTO images(hash, path, rating, model, generatedBy, sourcePath, name, fileName) VALUES($hash, $path, $rating, $model, $generatedBy, $sourcePath, $name, $fileName)`,
              {
                $hash: imageHash,
                $path: modelImagesPath,
                $rating: 1,
                $model: metadata.model,
                $generatedBy: metadata.generatedBy,
                $sourcePath: files[i],
                $name: fileNameNoExt,
                $fileName: fileName,
              },
            );
          } catch (error) {
            console.log(error);
          }
        }
      }
    }
  }
};
