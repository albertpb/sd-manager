import fs from 'fs';
import path from 'path';
import { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import log from 'electron-log/main';
import {
  checkFileExists,
  downloadImage,
  downloadModelInfoByHash,
  checkFolderExists,
  readModelInfoFile,
  getModelInfo,
  sleep,
  getAllFiles,
  hashFilesInBackground,
} from '../util';
import SqliteDB from '../db';
import { ModelCivitaiInfo } from '../interfaces';

export type Model = {
  hash: string;
  name: string;
  path: string;
  type: string;
  rating: number;
  baseModel: string | null;
  modelId: number | null;
  modelVersionId: number | null;
  description: string;
};

export const removeModelsNotFound = async (files: string[], type: string) => {
  const db = await SqliteDB.getInstance().getdb();

  const models: Model[] = await db.all(
    `SELECT * FROM models WHERE type = $type`,
    { $type: type },
  );

  const filesHashMap = files.reduce((acc: Record<string, string>, f) => {
    acc[f] = f;
    return acc;
  }, {});

  for (let i = 0; i < models.length; i++) {
    if (!filesHashMap[models[i].path]) {
      await db.run(`DELETE FROM models WHERE path = $path AND type = $type`, {
        $path: models[i].path,
        $type: type,
      });
    }
  }
};

const notifyProgressModel = (
  browserWindow: BrowserWindow | null,
  msg: string,
  progress: number,
) => {
  if (browserWindow !== null) {
    browserWindow.webContents.send('models-progress', msg, progress);
  }
};

export const readdirModelsIpc = async (
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  modelType: string,
  folderPath: string,
) => {
  const folderExists = await checkFolderExists(folderPath);
  if (!folderExists) return {};

  const db = await SqliteDB.getInstance().getdb();
  const models: Model[] = await db.all(`SELECT * FROM models`);
  const modelsHashMap = models.reduce((acc: Record<string, Model>, row) => {
    if (row.type === modelType) {
      acc[row.path] = row;
    }
    return acc;
  }, {});

  const files = getAllFiles(folderPath).filter(
    (f) => f.endsWith('.safetensors') || f.endsWith('.ckpt'),
  );

  await removeModelsNotFound(files, modelType);

  const filesHashes = await hashFilesInBackground(
    files.filter((f) => !modelsHashMap[f]),
    (progress) =>
      notifyProgressModel(browserWindow, `Hashing models...`, progress),
  );

  for (let i = 0; i < files.length; i++) {
    const parsedFile = path.parse(files[i]);
    const baseName = parsedFile.base;
    const fileNameNoExt = parsedFile.name;
    const fileFolderPath = parsedFile.dir;

    const progress = ((i + 1) / files.length) * 100;
    notifyProgressModel(browserWindow, `${baseName}`, progress);

    const modelInfoExists = await checkFileExists(
      `${fileFolderPath}\\${fileNameNoExt}.civitai.info`,
    );

    let modelInfo: ModelCivitaiInfo | undefined;

    if (modelInfoExists) {
      const modelInfoFile = fs.readFileSync(
        `${fileFolderPath}\\${fileNameNoExt}.civitai.info`,
        { encoding: 'utf-8' },
      );
      modelInfo = JSON.parse(modelInfoFile);
    }

    if (!modelsHashMap[files[i]]) {
      console.log('hashing', files[i]);
      log.info('hashing', files[i]);
      const hash = filesHashes[files[i]];

      if (!modelInfo) {
        // verify if is a valid hash by downloading info from civitai
        try {
          modelInfo = await downloadModelInfoByHash(
            fileNameNoExt,
            hash,
            fileFolderPath,
          );
        } catch (error) {
          console.log(error);
          log.error(error);
        }
      }

      try {
        await db.run(
          `INSERT INTO models(hash, name, path, type, rating, baseModel, modelId, modelVersionId) VALUES ($hash, $name, $path, $type, $rating, $baseModel, $modelId, $modelVersionId)`,
          {
            $hash: hash,
            $name: fileNameNoExt,
            $path: files[i],
            $type: modelType,
            $rating: 1,
            $baseModel: modelInfo?.baseModel || '',
            $modelId: modelInfo?.modelId || null,
            $modelVersionId: modelInfo?.id || null,
          },
        );
      } catch (error: any) {
        console.log(files[i], modelType, hash);
        console.log(error);

        if (error.errno === 19) {
          if (browserWindow !== null) {
            // await deleteModelFiles(fileFolderPath, fileNameNoExt);

            const model = await db.get(
              `SELECT name FROM models WHERE hash = $hash`,
              {
                $hash: hash,
              },
            );

            log.info(
              `Detected duplicated model, ${fileNameNoExt} collided with ${model.name}`,
            );

            browserWindow.webContents.send(
              'duplicates-detected',
              'Detected duplicated model',
              `${fileNameNoExt} collided with ${model.name}`,
            );
          }
        }
      }

      modelsHashMap[files[i]] = {
        hash,
        name: fileNameNoExt,
        path: fileFolderPath,
        type: modelType,
        rating: 1,
        baseModel: modelInfo?.baseModel || '',
        modelId: modelInfo?.id || null,
        modelVersionId: modelInfo?.modelId || null,
        description: '',
      };
    }

    if (!modelInfoExists) {
      try {
        modelInfo = await downloadModelInfoByHash(
          fileNameNoExt,
          modelsHashMap[files[i]].hash,
          fileFolderPath,
        );
      } catch (error) {
        console.log(error);
        log.info(error);
      }
    }

    if (modelInfoExists && !modelInfo) {
      const modelInfoStr = await fs.promises.readFile(
        `${fileFolderPath}\\${fileNameNoExt}.civitai.info`,
        { encoding: 'utf-8' },
      );
      modelInfo = JSON.parse(modelInfoStr);
    }

    const imageExists = await checkFileExists(
      `${fileFolderPath}\\${fileNameNoExt}.png`,
    );

    if (!imageExists) {
      if (modelInfo && modelInfo.images && modelInfo.images.length > 0) {
        const imagesModelFolder = `${fileFolderPath}\\${fileNameNoExt}`;
        const imagesModelFolderExists =
          await checkFolderExists(imagesModelFolder);
        if (!imagesModelFolderExists) {
          fs.mkdirSync(imagesModelFolder);
        }

        for (let c = 0; c < modelInfo.images.length; c++) {
          try {
            await downloadImage(
              `${fileNameNoExt}_${c}`,
              modelInfo.images[c].url,
              imagesModelFolder,
            );
          } catch (error) {
            console.log(error);
            log.info(error);
          }
        }
      }
    }

    if (
      modelsHashMap[files[i]].baseModel === '' ||
      modelsHashMap[files[i]].baseModel === null
    ) {
      if (modelInfo) {
        await db.run(
          `UPDATE models SET baseModel = $baseModel WHERE hash = $hash`,
          {
            $baseModel: modelInfo.baseModel,
            $hash: modelsHashMap[files[i]].hash,
          },
        );
      }
    }

    if (
      !modelsHashMap[files[i]].modelId ||
      !modelsHashMap[files[i]].modelVersionId
    ) {
      if (modelInfo) {
        await db.run(
          `UPDATE models SET modelId = $modelId, modelVersionId = $modelVersionId WHERE hash = $hash`,
          {
            $modelId: modelInfo.modelId,
            $modelVersionId: modelInfo.id,
            $hash: modelsHashMap[files[i]].hash,
          },
        );
      }
    }

    if (!modelsHashMap[files[i]].description) {
      if (modelInfo) {
        await db.run(
          `UPDATE models SET description = $description WHERE hash = $hash`,
          {
            $description: modelInfo.description,
            $hash: modelsHashMap[files[i]].hash,
          },
        );
      }
    }
  }

  return modelsHashMap;
};

export const readdirModelImagesIpc = async (
  event: IpcMainInvokeEvent,
  model: string,
  modelsPath: string,
) => {
  const folderPath = `${modelsPath}\\${model}`;

  const folderExists = await checkFolderExists(folderPath);

  if (folderExists) {
    const images = fs.readdirSync(folderPath);
    return images.map((f) => `${folderPath}\\${f}`);
  }

  return [];
};

export async function readModelsIpc(event: IpcMainInvokeEvent, type: string) {
  const db = await SqliteDB.getInstance().getdb();
  const models: Model[] = await db.all(
    `SELECT * FROM models WHERE type = $type`,
    {
      $type: type,
    },
  );

  return models.reduce((acc: Record<string, Model>, model: Model) => {
    acc[model.hash] = model;
    return acc;
  }, {});
}

export const updateModel = async (
  hash: string,
  field: string,
  value: string,
) => {
  const db = await SqliteDB.getInstance().getdb();
  await db.run(`UPDATE models SET ${field} = $value WHERE hash = $hash`, {
    $value: value,
    $hash: hash,
  });
};

export async function updateModelIpc(
  event: IpcMainInvokeEvent,
  hash: string,
  field: string,
  value: string,
) {
  await updateModel(hash, field, value);
}

export const readModelInfoIpc = async (
  event: IpcMainInvokeEvent,
  model: string,
  folderPath: string,
) => {
  const modelInfo = await readModelInfoFile(
    `${folderPath}\\${model}.civitai.info`,
  );

  return modelInfo;
};

export async function readModelIpc(event: IpcMainInvokeEvent, hash: string) {
  const db = await SqliteDB.getInstance().getdb();
  return db.get(`SELECT * FROM models WHERE hash = $hash`, {
    $hash: hash,
  });
}

export async function readModelByNameIpc(
  event: IpcMainInvokeEvent,
  name: string,
  type: string,
) {
  const db = await SqliteDB.getInstance().getdb();
  return db.get(`SELECT * FROM models WHERE name = $name AND type = $type`, {
    $name: name,
    $type: type,
  });
}

export async function checkModelsToUpdateIpc(
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  type: string,
) {
  const db = await SqliteDB.getInstance().getdb();
  const models: Model[] = await db.all(
    `SELECT * FROM models WHERE type = $type`,
    {
      $type: type,
    },
  );

  const modelsById = models.reduce((acc: Record<string, Model>, model) => {
    if (model.modelVersionId) {
      acc[model.modelVersionId] = model;
    }
    return acc;
  }, {});

  const modelsIdsSet = new Set<number>();
  for (let i = 0; i < models.length; i++) {
    const modelId = models[i].modelId;
    if (modelId !== null) {
      modelsIdsSet.add(modelId);
    }
  }
  let modelsIds = Array.from(modelsIdsSet) as number[];
  modelsIds = modelsIds.sort((a, b) => a - b);

  for (let i = 0; i < modelsIds.length; i++) {
    try {
      if (browserWindow !== null) {
        browserWindow.webContents.send(
          'checking-model-update',
          true,
          modelsIds[i],
        );
      }

      await sleep(2000);

      const model = await getModelInfo(modelsIds[i]);

      if (browserWindow !== null) {
        browserWindow.webContents.send(
          'checking-model-update',
          false,
          modelsIds[i],
        );
      }

      if (!modelsById[model.modelVersions[0].id]) {
        if (browserWindow !== null) {
          browserWindow.webContents.send('model-need-update', modelsIds[i]);
        }
      }
    } catch (error) {
      console.log(error);
      log.info(error);

      if (browserWindow !== null) {
        browserWindow.webContents.send(
          'checking-model-update',
          false,
          modelsIds[i],
        );
      }
    }
  }
}
