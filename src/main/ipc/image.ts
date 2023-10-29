import fs from 'fs';
import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import path from 'path';
import sharp from 'sharp';
import SqliteDB from '../db';
import { calculateHashFile, checkFileExists, getAllFiles } from '../util';
import { extractMetadata, parseImageSdMeta } from '../exif';

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
};

export async function getImagesIpc(
  event: IpcMainInvokeEvent,
  modelName: string | undefined,
) {
  const db = await SqliteDB.getInstance().getdb();

  if (modelName) {
    return db.all(
      `SELECT *, row_number() over (order by '') as rowNum FROM images WHERE model = $modelName ORDER BY rating DESC, rowNum DESC`,
      {
        $modelName: modelName,
      },
    );
  }

  return db.all(
    `SELECT *, row_number() over (order by '') as rowNum FROM images ORDER BY rating DESC, rowNum DESC`,
  );
}

export async function getImageIpc(event: IpcMainInvokeEvent, hash: string) {
  const db = await SqliteDB.getInstance().getdb();
  return db.get(
    `SELECT *, row_number() over (order by '') as rowNum FROM images WHERE hash = $hash ORDER BY rating DESC, rowNum DESC`,
    {
      $hash: hash,
    },
  );
}

export async function updateImageIpc(
  event: IpcMainInvokeEvent,
  hash: string,
  field: string,
  value: string,
) {
  const db = await SqliteDB.getInstance().getdb();
  return db.run(`UPDATE images SET ${field} = $value WHERE hash = $hash`, {
    $value: value,
    $hash: hash,
  });
}

export async function removeImagesIpc(
  event: IpcMainInvokeEvent,
  images: Record<string, ImageRow>,
) {
  const db = await SqliteDB.getInstance().getdb();
  const imagesToDelete = Object.values(images);

  for (let i = 0; i < imagesToDelete.length; i++) {
    await db.run(`DELETE FROM images WHERE hash = $hash`, {
      $hash: imagesToDelete[i].hash,
    });

    const pathParsed = path.parse(imagesToDelete[i].sourcePath);
    try {
      fs.unlinkSync(imagesToDelete[i].sourcePath);
    } catch (error) {
      console.log(error);
    }
    try {
      fs.unlinkSync(`${pathParsed.dir}\\${pathParsed.name}.thumbnail.webp`);
    } catch (error) {
      console.log(error);
    }
    try {
      fs.rmSync(`${pathParsed.dir}\\${pathParsed.name}`, {
        recursive: true,
      });
    } catch (error) {
      console.log(error);
    }
  }
}

export const scanImagesIpc = async (browserWindow: BrowserWindow | null) => {
  const db = await SqliteDB.getInstance().getdb();

  const foldersToWatch: { path: string }[] = await db.all(
    `SELECT * FROM watch_folders`,
  );

  const imagesRows: ImageRow[] = await db.all(`SELECT * FROM images`);
  const imagesRowsHashMap = imagesRows.reduce(
    (acc: Record<string, ImageRow>, row) => {
      acc[row.hash] = row;
      return acc;
    },
    {},
  );

  const files = foldersToWatch
    .map((f) => f.path)
    .reduce((acc: string[], folder) => {
      acc = acc.concat(getAllFiles(folder).filter((f) => f.endsWith('png')));
      return acc;
    }, []);

  for (let i = 0; i < files.length; i++) {
    const parsedFilePath = path.parse(files[i]);
    const ext = parsedFilePath.ext;
    const file = fs.readFileSync(files[i]);
    const exif = extractMetadata(file);

    if (browserWindow !== null) {
      const progress = ((i + 1) / files.length) * 100;
      const msg = `${files[i]}`;
      browserWindow.webContents.send('images-progress', msg, progress);
    }

    if (ext === '.png') {
      const metadata = parseImageSdMeta(exif);

      if (metadata && metadata.model) {
        const imageHash = await calculateHashFile(files[i]);

        if (!imagesRowsHashMap[imageHash]) {
          const imageFile = fs.readFileSync(files[i]);
          const thumbnailDestPath = `${parsedFilePath.dir}\\${parsedFilePath.name}.thumbnail.webp`;
          const thumbnailExists = await checkFileExists(thumbnailDestPath);
          if (!thumbnailExists) {
            await sharp(imageFile)
              .resize({ height: 400 })
              .withMetadata()
              .toFormat('webp')
              .toFile(thumbnailDestPath);
          }

          try {
            await db.run(
              `INSERT INTO images(hash, path, rating, model, generatedBy, sourcePath, name, fileName) VALUES($hash, $path, $rating, $model, $generatedBy, $sourcePath, $name, $fileName)`,
              {
                $hash: imageHash,
                $path: parsedFilePath.dir,
                $rating: 1,
                $model: metadata.model,
                $generatedBy: metadata.generatedBy,
                $sourcePath: files[i],
                $name: parsedFilePath.name,
                $fileName: parsedFilePath.base,
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
