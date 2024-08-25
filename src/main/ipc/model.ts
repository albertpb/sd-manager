import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import log from 'electron-log/main';
import { convertPath } from '../../renderer/utils';
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
  retryPromise,
} from '../util';
import SqliteDB from '../db';
import { ModelCivitaiInfo, ModelInfo, ModelInfoImage } from '../interfaces';

export type ModelType = 'lora' | 'checkpoint';

export type Model = {
  rowNum?: number;
  hash: string;
  name: string;
  fileName: string;
  path: string;
  type: ModelType;
  rating: number;
  baseModel: string | null;
  modelId: number | null;
  modelVersionId: number | null;
  description: string;
  modelDescription: string | null;
  tags: Record<string, string>;
};

export const removeModelsNotFound = async (files: string[], type: string) => {
  const db = await SqliteDB.getInstance().getdb();

  const models: { path: string }[] = await db.all(
    `SELECT path FROM models WHERE type = $type`,
    { $type: type },
  );

  const filesMap = files.reduce((acc: Record<string, string>, f) => {
    acc[f] = f;
    return acc;
  }, {});

  for (let i = 0; i < models.length; i++) {
    if (!filesMap[models[i].path]) {
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
  type: string,
) => {
  if (browserWindow !== null) {
    browserWindow.webContents.send('models-progress', msg, progress, type);
  }
};

export const readdirModelsIpc = async (
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  modelType: ModelType,
  folderPath: string,
) => {
  const folderExists = await checkFolderExists(folderPath);
  if (!folderExists) return {};

  const db = await SqliteDB.getInstance().getdb();

  const models = await db.all(
    `SELECT models.rowid as rowNum, models.hash, models.name, models.fileName, models.path, models.type, models.rating, models.baseModel, models.modelId, models.modelVersionId, models.description, models.modelDescription, GROUP_CONCAT(mtags.id) AS tags FROM models LEFT JOIN models_mtags ON models_mtags.modelHash = models.hash LEFT JOIN mtags ON mtags.id = models_mtags.tagId GROUP BY models.hash ORDER BY models.rating DESC, rowNum DESC`,
  );

  for (let i = 0; i < models.length; i++) {
    models[i].tags =
      typeof models[i].tags === 'string' && models[i].tags !== ''
        ? models[i].tags
            .split(',')
            .reduce((acc: Record<string, string>, tag: string) => {
              acc[tag] = tag;
              return acc;
            }, {})
        : {};
  }

  const modelsPathMap: Record<string, Model> = {};
  const modelsHashMap: Record<string, Model> = {};
  models.forEach((row) => {
    if (row.type === modelType) {
      modelsPathMap[row.path] = row;
      modelsHashMap[row.hash] = row;
    }
  });

  const allFiles = getAllFiles(folderPath);

  const modelsFiles = allFiles.filter(
    (f) => f.endsWith('.safetensors') || f.endsWith('.ckpt'),
  );

  console.log('files count', modelsFiles.length);

  const filesHashes = await hashFilesInBackground(modelsFiles, (progress) =>
    notifyProgressModel(
      browserWindow,
      `Hashing models...`,
      progress,
      modelType,
    ),
  );

  // detect duplicate hashes
  const duplicatedFiles = new Set();

  Object.entries(filesHashes).reduce(
    (acc: Record<string, boolean>, [filePath, hash]) => {
      if (!acc[hash]) {
        acc[hash] = true;
      } else if (
        browserWindow &&
        modelsHashMap[hash] &&
        modelsHashMap[hash].fileName !== path.parse(filePath).name
      ) {
        browserWindow.webContents.send(
          'duplicates-detected',
          'Detected duplicated model',
          `${modelsHashMap[hash].fileName} collided with ${filePath}`,
        );
        duplicatedFiles.add(filePath);
      }

      return acc;
    },
    {},
  );

  for (let i = 0; i < modelsFiles.length; i++) {
    if (duplicatedFiles.has(modelsFiles[i])) {
      continue;
    }

    const parsedFile = path.parse(modelsFiles[i]);
    const baseName = parsedFile.base;
    const fileNameNoExt = parsedFile.name;
    const fileFolderPath = parsedFile.dir;

    const progress = ((i + 1) / modelsFiles.length) * 100;
    notifyProgressModel(browserWindow, `${baseName}`, progress, modelType);

    const modelVersionInfoExists = await checkFileExists(
      convertPath(
        `${fileFolderPath}\\${fileNameNoExt}.civitai.info`,
        os.platform(),
      ),
    );

    let modelVersionInfo: ModelCivitaiInfo | undefined;

    if (modelVersionInfoExists) {
      const modelVersionInfoFile = await fs.promises.readFile(
        convertPath(
          `${fileFolderPath}\\${fileNameNoExt}.civitai.info`,
          os.platform(),
        ),
        { encoding: 'utf-8' },
      );
      modelVersionInfo = JSON.parse(modelVersionInfoFile);
    }

    const hash = filesHashes[modelsFiles[i]];

    if (!modelVersionInfo) {
      // verify if is a valid hash by downloading info from civitai
      try {
        modelVersionInfo = await downloadModelInfoByHash(
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
      let modelInfo: ModelInfo | undefined;

      if (modelVersionInfo && modelVersionInfo.modelId) {
        try {
          modelInfo = await getModelInfo(
            modelVersionInfo.modelId,
            fileNameNoExt,
            fileFolderPath,
          );
        } catch (error) {
          console.log(error);
          log.error(error);
        }
      }

      const modelName = `${modelInfo?.name || ''} ${modelVersionInfo?.name || ''}`;

      await db.run(
        `INSERT INTO models(hash, name, fileName, path, type, rating, baseModel, modelId, modelDescription, modelVersionId) VALUES (
          $hash,
          $name,
          $fileName,
          $path,
          $type,
          $rating,
          $baseModel,
          $modelId,
          $modelDescription,
          $modelVersionId) ON CONFLICT DO UPDATE
          SET path = $path`,
        {
          $hash: hash,
          $name: modelName.trim() === '' ? fileNameNoExt : modelName,
          $fileName: fileNameNoExt,
          $path: modelsFiles[i],
          $type: modelType,
          $rating: 1,
          $baseModel: modelVersionInfo?.baseModel || '',
          $modelId: modelVersionInfo?.modelId || null,
          $modelDescription: modelInfo?.description,
          $modelVersionId: modelVersionInfo?.id || null,
        },
      );
    } catch (error: any) {
      console.log(modelsFiles[i], modelType, hash);
      console.log(error);
    }

    if (!modelVersionInfoExists) {
      try {
        modelVersionInfo = await downloadModelInfoByHash(
          fileNameNoExt,
          hash,
          fileFolderPath,
        );
      } catch (error) {
        console.log(error);
        log.info(error);
      }
    }

    if (modelVersionInfoExists && !modelVersionInfo) {
      const modelInfoStr = await fs.promises.readFile(
        convertPath(
          `${fileFolderPath}\\${fileNameNoExt}.civitai.info`,
          os.platform(),
        ),
        { encoding: 'utf-8' },
      );
      modelVersionInfo = JSON.parse(modelInfoStr);
    }

    const imageExists = await checkFileExists(
      convertPath(`${fileFolderPath}\\${fileNameNoExt}.png`, os.platform()),
    );

    const imageJsonExists = await checkFileExists(
      convertPath(`${fileFolderPath}\\${fileNameNoExt}.json`, os.platform()),
    );

    if (!imageExists || !imageJsonExists) {
      if (
        modelVersionInfo &&
        modelVersionInfo.images &&
        modelVersionInfo.images.length > 0
      ) {
        const imagesModelFolder = convertPath(
          `${fileFolderPath}\\${fileNameNoExt}`,
          os.platform(),
        );
        const imagesModelFolderExists =
          await checkFolderExists(imagesModelFolder);
        if (!imagesModelFolderExists) {
          await fs.promises.mkdir(imagesModelFolder);
        }

        for (let c = 0; c < modelVersionInfo.images.length; c++) {
          try {
            await downloadImage(
              `${fileNameNoExt}_${c}`,
              modelVersionInfo.images[c],
              imagesModelFolder,
            );
          } catch (error) {
            console.log(error);
            log.info(error);
          }
        }
      }
    }

    if (modelsPathMap[modelsFiles[i]]) {
      if (
        modelsPathMap[modelsFiles[i]].baseModel === '' ||
        modelsPathMap[modelsFiles[i]].baseModel === null
      ) {
        if (modelVersionInfo) {
          await db.run(
            `UPDATE models SET baseModel = $baseModel WHERE hash = $hash`,
            {
              $baseModel: modelVersionInfo.baseModel,
              $hash: modelsPathMap[modelsFiles[i]].hash,
            },
          );
        }
      }

      if (
        !modelsPathMap[modelsFiles[i]].modelId ||
        !modelsPathMap[modelsFiles[i]].modelVersionId
      ) {
        if (modelVersionInfo) {
          await db.run(
            `UPDATE models SET modelId = $modelId, modelVersionId = $modelVersionId WHERE hash = $hash`,
            {
              $modelId: modelVersionInfo.modelId,
              $modelVersionId: modelVersionInfo.id,
              $hash: modelsPathMap[modelsFiles[i]].hash,
            },
          );
        }
      }

      if (!modelsPathMap[modelsFiles[i]].description) {
        if (modelVersionInfo) {
          await db.run(
            `UPDATE models SET description = $description WHERE hash = $hash`,
            {
              $description: modelVersionInfo.description,
              $hash: modelsPathMap[modelsFiles[i]].hash,
            },
          );
        }
      }
    }
  }

  await removeModelsNotFound(modelsFiles, modelType);

  return modelsPathMap;
};

export const readdirModelImagesIpc = async (
  event: IpcMainInvokeEvent,
  model: string,
  modelsPath: string,
) => {
  const folderPath = convertPath(`${modelsPath}\\${model}`, os.platform());

  const folderExists = await checkFolderExists(folderPath);

  if (folderExists) {
    const images = await fs.promises.readdir(folderPath);
    return images.reduce((acc: [string, ModelInfoImage | null][], f, i) => {
      if (f.endsWith('.png') || f.endsWith('jpg') || f.endsWith('jpeg')) {
        if (images[i + 1]?.endsWith('.json')) {
          const jsonFile = fs.readFileSync(
            convertPath(`${folderPath}\\${images[i + 1]}`, os.platform()),
            {
              encoding: 'utf-8',
            },
          );
          acc.push([
            convertPath(`${folderPath}\\${f}`, os.platform()),
            JSON.parse(jsonFile),
          ]);
        } else {
          acc.push([convertPath(`${folderPath}\\${f}`, os.platform()), null]);
        }
      }
      return acc;
    }, []);
  }

  return [];
};

export async function readModelsIpc(event: IpcMainInvokeEvent, type: string) {
  const db = await SqliteDB.getInstance().getdb();
  const models: Model[] = await db.all(
    `SELECT models.rowid as rowNum, models.hash, models.name, models.fileName, models.path, models.type, models.rating, models.baseModel, models.modelId, models.modelVersionId, models.description, models.modelDescription, GROUP_CONCAT(mtags.id) AS tags FROM models LEFT JOIN models_mtags ON models_mtags.modelHash = models.hash LEFT JOIN mtags ON mtags.id = models_mtags.tagId WHERE type = $type GROUP BY models.hash ORDER BY models.rating DESC, rowNum DESC`,
    {
      $type: type,
    },
  );

  return models.reduce(
    (
      acc: Record<string, Model>,
      model: Model & { tags: string | Record<string, string> },
    ) => {
      model.tags =
        typeof model.tags === 'string' && model.tags !== ''
          ? model.tags
              .split(',')
              .reduce((tagMap: Record<string, string>, tag) => {
                tagMap[tag] = tag;
                return tagMap;
              }, {})
          : {};
      acc[model.hash] = model;
      return acc;
    },
    {},
  );
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
    convertPath(`${folderPath}\\${model}.civitai.info`, os.platform()),
  );

  return modelInfo;
};

export async function readModelIpc(event: IpcMainInvokeEvent, hash: string) {
  const db = await SqliteDB.getInstance().getdb();
  const models = await db.get(
    `SELECT models.rowid as rowNum, models.hash, models.name, models.fileName, models.path, models.type, models.rating, models.baseModel, models.modelId, models.modelVersionId, models.description, models.modelDescription, GROUP_CONCAT(mtags.id) AS tags FROM models LEFT JOIN models_mtags ON models_mtags.modelHash = models.hash LEFT JOIN mtags ON mtags.id = models_mtags.tagId WHERE hash = $hash GROUP BY models.hash ORDER BY models.rating DESC, rowNum DESC`,
    {
      $hash: hash,
    },
  );

  models.forEach((model: Model & { tags: string | Record<string, string> }) => {
    model.tags =
      typeof model.tags === 'string' && model.tags !== ''
        ? model.tags.split(',').reduce((acc: Record<string, string>, tag) => {
            acc[tag] = tag;
            return acc;
          }, {})
        : {};
  });

  return models;
}

export async function readModelByNameIpc(
  event: IpcMainInvokeEvent,
  name: string,
  type: string,
) {
  const db = await SqliteDB.getInstance().getdb();
  const model = await db.get(
    `SELECT models.rowid as rowNum, models.hash, models.name, models.fileName, models.path, models.type, models.rating, models.baseModel, models.modelId, models.modelVersionId, models.description, models.modelDescription, GROUP_CONCAT(mtags.id) AS tags FROM models LEFT JOIN models_mtags ON models_mtags.modelHash = models.hash LEFT JOIN mtags ON mtags.id = models_mtags.tagId WHERE name = $name AND type = $type GROUP BY models.hash ORDER BY models.rating DESC, rowNum DESC`,
    {
      $name: name,
      $type: type,
    },
  );

  if (model) {
    model.tags =
      typeof model.tags === 'string' && model.tags !== ''
        ? model.tags
            .split(',')
            .reduce((acc: Record<string, string>, tag: string) => {
              acc[tag] = tag;
              return acc;
            }, {})
        : {};

    return model;
  }
  return null;
}

export async function checkModelsToUpdateIpc(
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  type: string,
) {
  const db = await SqliteDB.getInstance().getdb();
  const models: Model[] = await db.all(
    `SELECT models.rowid as rowNum, models.hash, models.name, models.fileName, models.path, models.type, models.rating, models.baseModel, models.modelId, models.modelVersionId, models.description, models.modelDescription, GROUP_CONCAT(mtags.id) AS tags FROM models LEFT JOIN models_mtags ON models_mtags.modelHash = models.hash LEFT JOIN mtags ON mtags.id = models_mtags.tagId WHERE type = $type GROUP BY models.hash ORDER BY models.rating DESC, rowNum DESC`,
    {
      $type: type,
    },
  );

  const modelsByVersionId = models.reduce(
    (acc: Record<string, Model>, model) => {
      if (model.modelVersionId) {
        acc[model.modelVersionId] = model;
      }
      return acc;
    },
    {},
  );

  const modelsIds: number[] = [];
  for (let i = 0; i < models.length; i++) {
    const modelId = models[i].modelId;
    if (modelId !== null) {
      modelsIds.push(modelId);
    }
  }
  modelsIds.sort((a, b) => a - b);

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

      const model = await retryPromise(
        () => getModelInfo(modelsIds[i]),
        3,
        5000,
      );

      await db.run(
        `UPDATE models SET modelDescription = $modelDescription WHERE modelId = $modelId`,
        {
          $modelId: model.id,
          $modelDescription: model.description,
        },
      );

      if (browserWindow !== null) {
        browserWindow.webContents.send(
          'checking-model-update',
          false,
          modelsIds[i],
        );
      }

      if (!modelsByVersionId[model.modelVersions[0].id]) {
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

export const tagModelIpc = async (
  event: IpcMainInvokeEvent,
  tagId: string,
  modelHash: string,
) => {
  try {
    const db = await SqliteDB.getInstance().getdb();

    const tagExists = await db.get(`SELECT id FROM mtags WHERE id = $id`, {
      $id: tagId,
    });

    if (tagExists) {
      const modelIsTagged = await db.get(
        `SELECT tagId FROM models_mtags WHERE tagId = $tagId AND modelHash = $modelHash`,
        {
          $tagId: tagId,
          $modelHash: modelHash,
        },
      );

      if (!modelIsTagged) {
        await db.run(
          `INSERT INTO models_mtags (tagId, modelHash) VALUES ($tagId, $modelHash)`,
          {
            $tagId: tagId,
            $modelHash: modelHash,
          },
        );
      } else {
        await db.run(
          `DELETE FROM models_mtags WHERE tagId = $tagId AND modelHash = $modelHash`,
          {
            $tagId: tagId,
            $modelHash: modelHash,
          },
        );
      }
    } else {
      throw Error('tag not exists');
    }
  } catch (error) {
    console.error(error);
    log.error(error);
  }
};

export const removeAllModelsTagsIpc = async (
  event: IpcMainInvokeEvent,
  modelHash: string,
) => {
  try {
    const db = await SqliteDB.getInstance().getdb();

    await db.run(`DELETE FROM models_mtags WHERE modelHash = $modelHash`, {
      $modelHash: modelHash,
    });
  } catch (error) {
    console.error(error);
    log.error(error);
  }
};
