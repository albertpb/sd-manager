import fs from 'fs';
import path from 'path';
import log from 'electron-log/main';
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
  tags: Record<string, string>;
};

export async function getImages(modelName: string | undefined) {
  const db = await SqliteDB.getInstance().getdb();

  let images;
  if (modelName) {
    images = await db.all(
      `SELECT images.rowid as rowNum, images.hash, images.fileName, images.generatedBy, images.model, images.name, images.path, images.rating, images.sourcePath, GROUP_CONCAT(tags.id) AS tags FROM images LEFT JOIN images_tags ON images_tags.imageHash = images.hash LEFT JOIN tags ON tags.id = images_tags.tagId WHERE images.model = $modelName GROUP BY images.hash ORDER BY images.rating DESC, rowNum DESC`,
      {
        $modelName: modelName,
      },
    );
  } else {
    images = await db.all(
      `SELECT images.rowid as rowNum, images.hash, images.fileName, images.generatedBy, images.model, images.name, images.path, images.rating, images.sourcePath, GROUP_CONCAT(tags.id) AS tags FROM images LEFT JOIN images_tags ON images_tags.imageHash = images.hash LEFT JOIN tags ON tags.id = images_tags.tagId GROUP BY images.hash ORDER BY images.rating DESC, rowNum DESC`,
    );
  }

  images.forEach(
    (image: ImageRow & { tags: string | Record<string, string> }) => {
      image.tags =
        typeof image.tags === 'string' && image.tags !== ''
          ? image.tags.split(',').reduce((acc: Record<string, string>, tag) => {
              acc[tag] = tag;
              return acc;
            }, {})
          : {};
    },
  );
  return images;
}

export async function getImagesIpc(
  event: IpcMainInvokeEvent,
  modelName: string | undefined,
) {
  return getImages(modelName);
}

export async function getImage(hash: string): Promise<ImageRow> {
  const db = await SqliteDB.getInstance().getdb();
  const image = await db.get(
    `SELECT images.rowid as rowNum, images.hash, images.fileName, images.generatedBy, images.model, images.name, images.path, images.rating, images.sourcePath, GROUP_CONCAT(tags.id) AS tags FROM images LEFT JOIN images_tags ON images_tags.imageHash = images.hash LEFT JOIN tags ON tags.id = images_tags.tagId WHERE images.hash = $hash GROUP BY images.hash`,
    {
      $hash: hash,
    },
  );

  image.tags =
    typeof image.tags === 'string'
      ? image.tags
          .split(',')
          .reduce((acc: Record<string, string>, tag: string) => {
            acc[tag] = tag;
            return acc;
          }, {})
      : {};
  return image;
}

export async function getImageIpc(event: IpcMainInvokeEvent, hash: string) {
  return getImage(hash);
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
      log.info(error);
    }
    try {
      fs.unlinkSync(
        `${pathParsed.dir}\\thumbnails\\${pathParsed.name}.thumbnail.webp`,
      );
    } catch (error) {
      console.log(error);
      log.info(error);
    }
    try {
      fs.rmSync(`${pathParsed.dir}\\${pathParsed.name}`, {
        recursive: true,
      });
    } catch (error) {
      console.log(error);
      log.info(error);
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

export const regenerateThumbnailsIpc = async (
  browserWindow: BrowserWindow | null,
) => {
  const db = await SqliteDB.getInstance().getdb();

  const foldersToWatch = await db.all(`SELECT * FROM watch_folders`);

  const allFiles = foldersToWatch
    .map((fw) => fw.path)
    .reduce((acc: string[], folder) => {
      acc = acc.concat(getAllFiles(folder));
      return acc;
    }, []);

  const files = allFiles.filter((f) => {
    return f.endsWith('.png');
  });

  const filesToThumbnail: [string, string][] = [];

  for (let i = 0; i < files.length; i++) {
    const parsedFilePath = path.parse(files[i]);
    const thumbnailDestPath = `${parsedFilePath.dir}\\thumbnails\\${parsedFilePath.name}.thumbnail.webp`;

    filesToThumbnail.push([files[i], thumbnailDestPath]);
  }

  await makeThumbnails(filesToThumbnail, (progress) =>
    notifyProgressImage(browserWindow, `Making thumbnails...`, progress),
  );
};

export const scanImagesIpc = async (
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  foldersToWatch: string[],
) => {
  try {
    console.log('scaning images...');
    log.info('scaning imagess...');
    const db = await SqliteDB.getInstance().getdb();

    const imagesRows: ImageRow[] = await db.all(`SELECT * FROM images`);
    const imagesRowsPathMap = imagesRows.reduce(
      (acc: Record<string, ImageRow>, row) => {
        acc[row.sourcePath] = row;
        return acc;
      },
      {},
    );

    const allFiles = foldersToWatch.reduce((acc: string[], folder) => {
      acc = acc.concat(getAllFiles(folder));
      return acc;
    }, []);

    const files = allFiles.filter((f) => {
      return f.endsWith('.png') && !imagesRowsPathMap[f];
    });

    const thumbnailsFilesMap = allFiles
      .filter((f) => f.endsWith('thumbnail.webp'))
      .reduce((acc: Record<string, boolean>, f) => {
        acc[f] = true;
        return acc;
      }, {});

    const filesMetadata = await parseImagesMetadata(files, (progress) =>
      notifyProgressImage(browserWindow, `Parsing images...`, progress),
    );

    const filesHashes = await hashFilesInBackground(
      files,
      (progress) =>
        notifyProgressImage(browserWindow, `Hashing images...`, progress),
      'blake3',
    );

    const filesToThumbnail: [string, string][] = [];

    for (let i = 0; i < files.length; i++) {
      const parsedFilePath = path.parse(files[i]);

      const progress = ((i + 1) / files.length) * 100;
      notifyProgressImage(browserWindow, `Saving to database...`, progress);

      const thumbnailDestPath = `${parsedFilePath.dir}\\thumbnails\\${parsedFilePath.name}.thumbnail.webp`;
      if (!thumbnailsFilesMap[thumbnailDestPath]) {
        filesToThumbnail.push([files[i], thumbnailDestPath]);
      }

      const metadata = filesMetadata[files[i]];

      const autoTagImportImages = await db.get(
        `SELECT value FROM settings WHERE key = $key`,
        {
          $key: 'autoTagImportImages',
        },
      );

      const autoImportTags =
        autoTagImportImages.value === '1'
          ? await db.get(`SELECT value FROM settings WHERE key = $key`, {
              $key: 'autoImportTags',
            })
          : {
              value: '',
            };

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

            if (
              autoTagImportImages.value === '1' &&
              autoImportTags &&
              autoImportTags.value !== ''
            ) {
              const autoImportTagsArr =
                autoImportTags !== '' ? autoImportTags.value.split(',') : [];
              for (let j = 0; j < autoImportTagsArr.length; j++) {
                await db.run(
                  `INSERT INTO images_tags (tagId, imageHash) VALUES ($tagId, $imageHash)`,
                  {
                    $tagId: autoImportTagsArr[j],
                    $imageHash: imageHash,
                  },
                );
              }
            }
          } catch (error) {
            console.log(
              error,
              'found image already present in db',
              imageHash,
              files[i],
            );
            log.info(
              error,
              'found image already present in db',
              imageHash,
              files[i],
            );
            try {
              const duplicatedImageInDb = await db.get(
                `SELECT * FROM images WHERE hash = $hash`,
                {
                  $hash: imageHash,
                },
              );

              if (duplicatedImageInDb.path !== parsedFilePath.dir) {
                console.log(`path doesn't match, updating`);
                log.info(`path doesn't match, updating`);

                await db.run(
                  `UPDATE images SET sourcePath = $sourcePath, path = $path, name = $name, fileName = $fileName WHERE hash = $hash`,
                  {
                    $sourcePath: files[i],
                    $path: parsedFilePath.dir,
                    $name: parsedFilePath.name,
                    $fileName: parsedFilePath.base,
                    $hash: imageHash,
                  },
                );
              }
            } catch (e) {
              console.log(e);
              log.info(e);
            }
          }
        }
      }
    }

    await makeThumbnails(filesToThumbnail, (progress) =>
      notifyProgressImage(browserWindow, `Making thumbnails...`, progress),
    );
  } catch (error) {
    console.error(error);
    log.error(error);
  }
};

export const tagImageIpc = async (
  event: IpcMainInvokeEvent,
  tagId: string,
  imageHash: string,
) => {
  try {
    const db = await SqliteDB.getInstance().getdb();

    const tagExists = await db.get(`SELECT id FROM tags WHERE id = $id`, {
      $id: tagId,
    });

    if (tagExists) {
      const imageIsTagged = await db.get(
        `SELECT tagId FROM images_tags WHERE tagId = $tagId AND imageHash = $imageHash`,
        {
          $tagId: tagId,
          $imageHash: imageHash,
        },
      );

      if (!imageIsTagged) {
        await db.run(
          `INSERT INTO images_tags (tagId, imageHash) VALUES ($tagId, $imageHash)`,
          {
            $tagId: tagId,
            $imageHash: imageHash,
          },
        );
      } else {
        await db.run(
          `DELETE FROM images_tags WHERE tagId = $tagId AND imageHash = $imageHash`,
          {
            $tagId: tagId,
            $imageHash: imageHash,
          },
        );
      }
    } else {
      throw Error('tag not exits');
    }
  } catch (error) {
    console.error(error);
    log.error(error);
  }
};
