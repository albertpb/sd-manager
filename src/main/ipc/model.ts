import fs from 'fs';
import { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import {
  checkFileExists,
  downloadImage,
  downloadModelInfoByHash,
  calculateHashFile,
  checkFolderExists,
  readModelInfoFile,
} from '../util';
import SqliteDB from '../db';
import { settingsDB } from './settings';
import { ModelCivitaiInfo } from '../interfaces';

export type Model = {
  hash: string;
  name: string;
  path: string;
  type: string;
  rating: number;
  baseModel: string | null;
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
      acc[row.name] = row;
    }
    return acc;
  }, {});

  const scanModelsOnStart = await settingsDB('read', 'scanModelsOnStart');
  if (scanModelsOnStart.value === '0') {
    return modelsHashMap;
  }

  const dirents = fs.readdirSync(folderPath, {
    withFileTypes: true,
  });
  const files = dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((f) => f.match(/(.safetensors|.ckpt)/));

  for (let i = 0; i < files.length; i++) {
    const fileNameNoExt = files[i].substring(0, files[i].lastIndexOf('.'));

    if (browserWindow !== null) {
      const progress = ((i + 1) / files.length) * 100;
      const msg = `${files[i]}`;
      browserWindow.webContents.send('models-progress', msg, progress);
    }

    const modelInfoExists = await checkFileExists(
      `${folderPath}\\${fileNameNoExt}.civitai.info`,
    );

    let modelInfo: ModelCivitaiInfo | undefined;

    if (!modelsHashMap[fileNameNoExt]) {
      const hash = await calculateHashFile(`${folderPath}\\${files[i]}`);
      const path = `${folderPath}\\${files[i]}`;

      // verify if is a valid hash by downloading info from civitai
      try {
        modelInfo = await downloadModelInfoByHash(
          fileNameNoExt,
          hash,
          folderPath,
        );
      } catch (error) {
        continue;
      }

      try {
        await db.run(
          `INSERT INTO models(hash, name, path, type, rating, baseModel) VALUES ($hash, $name, $path, $type, $rating, $baseModel)`,
          {
            $hash: hash,
            $name: fileNameNoExt,
            $path: path,
            $type: modelType,
            $rating: 1,
            $baseModel: modelInfo?.baseModel || '',
          },
        );
      } catch (error) {
        console.log(fileNameNoExt, modelType, hash);
        console.log(error);

        if (browserWindow !== null) {
          browserWindow.webContents.send(
            'duplicates-detected',
            'Detected model duplicated',
            fileNameNoExt,
          );
        }
      }

      modelsHashMap[fileNameNoExt] = {
        hash,
        name: fileNameNoExt,
        path,
        type: modelType,
        rating: 1,
        baseModel: modelInfo?.baseModel || '',
      };
    }

    if (!modelInfoExists) {
      try {
        modelInfo = await downloadModelInfoByHash(
          fileNameNoExt,
          modelsHashMap[fileNameNoExt].hash,
          folderPath,
        );
      } catch (error) {
        console.log(error);
      }
    }

    if (modelInfoExists && !modelInfo) {
      const modelInfoStr = await fs.promises.readFile(
        `${folderPath}\\${fileNameNoExt}.civitai.info`,
        { encoding: 'utf-8' },
      );
      modelInfo = JSON.parse(modelInfoStr);
    }

    const imageExists = await checkFileExists(
      `${folderPath}\\${fileNameNoExt}.png`,
    );

    if (!imageExists) {
      if (modelInfo && modelInfo.images && modelInfo.images.length > 0) {
        const imagesModelFolder = `${folderPath}\\${fileNameNoExt}`;
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
          }
        }
      }
    }

    if (
      modelsHashMap[fileNameNoExt].baseModel === '' ||
      modelsHashMap[fileNameNoExt].baseModel === null
    ) {
      if (modelInfo) {
        await db.run(
          `UPDATE models SET baseModel = $baseModel WHERE hash = $hash`,
          {
            $baseModel: modelInfo.baseModel,
            $hash: modelsHashMap[fileNameNoExt].hash,
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

export async function updateModelIpc(
  event: IpcMainInvokeEvent,
  hash: string,
  field: string,
  value: string,
) {
  const db = await SqliteDB.getInstance().getdb();
  return db.run(`UPDATE models SET ${field} = $value WHERE hash = $hash`, {
    $value: value,
    $hash: hash,
  });
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
