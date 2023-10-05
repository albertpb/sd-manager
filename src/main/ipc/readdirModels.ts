import fs from 'fs';
import { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import {
  checkFileExists,
  downloadImage,
  downloadModelInfoByHash,
  calculateHashFile,
  checkFolderExists,
} from '../util';
import SqliteDB from '../db';
import { settingsDB } from './settings';

export type Model = {
  hash: string;
  name: string;
  path: string;
  type: string;
};

export const readdirModelsIpc = async (
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  modelType: string,
  folderPath: string
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

    const modelInfoExists = await checkFileExists(
      `${folderPath}\\${fileNameNoExt}.civitai.info`
    );

    let modelInfo;

    if (!modelsHashMap[fileNameNoExt]) {
      const hash = await calculateHashFile(`${folderPath}\\${files[i]}`);
      const path = `${folderPath}\\${files[i]}`;

      // verify if is a valid hash by downloading info from civitai
      try {
        modelInfo = await downloadModelInfoByHash(
          fileNameNoExt,
          hash,
          folderPath
        );
      } catch (error) {
        continue;
      }

      try {
        await db.run(
          `INSERT INTO models(hash, name, path, type) VALUES (?, ?, ?, ?)`,
          {
            1: hash,
            2: fileNameNoExt,
            3: path,
            4: modelType,
          }
        );
      } catch (error) {
        console.log(fileNameNoExt, modelType, hash);
        console.log(error);
      }

      modelsHashMap[fileNameNoExt] = {
        hash,
        name: fileNameNoExt,
        path,
        type: modelType,
      };
    }

    if (modelInfoExists && !modelInfo) {
      const modelInfoStr = await fs.promises.readFile(
        `${folderPath}\\${fileNameNoExt}.civitai.info`,
        { encoding: 'utf-8' }
      );
      modelInfo = JSON.parse(modelInfoStr);
    }

    const imageExists = await checkFileExists(
      `${folderPath}\\${fileNameNoExt}.png`
    );

    if (!imageExists) {
      if (modelInfo && modelInfo.images && modelInfo.images.length > 0) {
        const imagesModelFolder = `${folderPath}\\${fileNameNoExt}`;
        const imagesModelFolderExists = await checkFolderExists(
          imagesModelFolder
        );
        if (!imagesModelFolderExists) {
          fs.mkdirSync(imagesModelFolder);
        }

        for (let c = 0; c < modelInfo.images.length; c++) {
          try {
            await downloadImage(
              `${fileNameNoExt}_${c}`,
              modelInfo.images[c].url,
              imagesModelFolder
            );
          } catch (error) {
            console.log(error);
          }
        }
      }
    }

    if (browserWindow !== null) {
      const progress = ((i + 1) / files.length) * 100;
      const msg = `${files[i]}`;
      browserWindow.webContents.send('models-progress', msg, progress);
    }
  }

  return modelsHashMap;
};
