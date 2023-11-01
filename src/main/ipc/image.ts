import fs from 'fs';
import os from 'os';
import path from 'path';
import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import SqliteDB from '../db';
import {
  getAllFiles,
  hashFilesInBackground,
  makeThumbnails,
  parseImagesMetadata,
} from '../util';

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

const notifyProgressImage = (
  browserWindow: BrowserWindow | null,
  msg: string,
  progress: number,
) => {
  if (browserWindow !== null) {
    browserWindow.webContents.send('images-progress', msg, progress);
  }
};

export const scanImagesIpc = async (
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  foldersToWatch: string[],
) => {
  const db = await SqliteDB.getInstance().getdb();

  const imagesRows: ImageRow[] = await db.all(`SELECT * FROM images`);
  const imagesRowsPathMap = imagesRows.reduce(
    (acc: Record<string, ImageRow>, row) => {
      acc[row.sourcePath] = row;
      return acc;
    },
    {},
  );

  const files = foldersToWatch.reduce((acc: string[], folder) => {
    acc = acc.concat(getAllFiles(folder).filter((f) => f.endsWith('png')));
    return acc;
  }, []);

  const thumbnailsFilesMap = foldersToWatch
    .reduce((acc: string[], folder) => {
      acc = acc.concat(
        getAllFiles(folder).filter((f) => f.endsWith('thumbnail.webp')),
      );
      return acc;
    }, [])
    .reduce((acc: Record<string, boolean>, f) => {
      acc[f] = true;
      return acc;
    }, {});

  const filesMetadata = await parseImagesMetadata(
    files.filter(
      (f) =>
        !imagesRowsPathMap[f] ||
        (imagesRowsPathMap[f] && imagesRowsPathMap[f].model === 'unknown'),
    ),
    os.cpus().length,
    (progress) =>
      notifyProgressImage(browserWindow, `Parsing images...`, progress),
  );

  const filesHashes = await hashFilesInBackground(
    files.filter((f) => !imagesRowsPathMap[f]),
    (progress) =>
      notifyProgressImage(browserWindow, `Hashing images...`, progress),
    'blake3',
    os.cpus().length * 2,
  );

  const filesToThumbnail: [string, string][] = [];

  for (let i = 0; i < files.length; i++) {
    const parsedFilePath = path.parse(files[i]);

    const progress = ((i + 1) / files.length) * 100;
    notifyProgressImage(browserWindow, `${files[i]}`, progress);

    const thumbnailDestPath = `${parsedFilePath.dir}\\${parsedFilePath.name}.thumbnail.webp`;
    if (!thumbnailsFilesMap[thumbnailDestPath]) {
      filesToThumbnail.push([files[i], thumbnailDestPath]);
    }

    const metadata = filesMetadata[files[i]];

    if (metadata && metadata.model) {
      const imageHash = filesHashes[files[i]];

      if (!imagesRowsPathMap[files[i]]) {
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
        } catch (error: any) {
          if (error.errno === 19) {
            await db.run(
              `UPDATE images SET sourcePath = $sourcePath, path = $path WHERE hash = $hash`,
              {
                $sourcePath: files[i],
                $path: path.dirname(files[i]),
                $hash: imageHash,
              },
            );
          } else {
            console.log(error);
          }
        }
      }

      if (
        imagesRowsPathMap[files[i]] &&
        imagesRowsPathMap[files[i]].model === 'unknown'
      ) {
        try {
          await db.run(
            `UPDATE images SET model = $model, generatedBy = $generatedBy WHERE hash = $hash`,
            {
              $hash: imageHash,
              $model: metadata.model,
              $generatedBy: metadata.generatedBy,
            },
          );
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  await makeThumbnails(filesToThumbnail, os.cpus().length, (progress) =>
    notifyProgressImage(browserWindow, `Making thumbnails...`, progress),
  );
};
