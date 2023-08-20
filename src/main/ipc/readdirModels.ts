import fs from 'fs';
import { app, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import {
  checkFileExists,
  downloadImage,
  downloadModelInfoByHash,
  calculateHashFile,
  checkFolderExists,
} from '../util';
import { ModelInfo } from '../interfaces';

export interface ReadDirModelInfo {
  hash: string;
  modelPath: string;
  fileName: string;
}

export const readdirModelsIpc = async (
  browserWindow: BrowserWindow | null,
  event: IpcMainInvokeEvent,
  model: string,
  folderPath: string
) => {
  const userDataPath = `${app.getPath('userData')}`;
  const readdirdbPathFile = `${userDataPath}\\readdir.json`;
  const readdirdbExists = await checkFileExists(readdirdbPathFile);
  let readdirdb;

  if (readdirdbExists) {
    readdirdb = fs.readFileSync(readdirdbPathFile, { encoding: 'utf-8' });
    readdirdb = JSON.parse(readdirdb);
  } else {
    readdirdb = {
      [model]: {
        [folderPath]: {
          files: {},
        },
      },
    };
  }

  let files = fs.readdirSync(folderPath);
  files = files.filter((f) => f.match(/(.safetensors|.ckpt)/));

  const filesHashMap: Record<string, ReadDirModelInfo> = {};

  /*
  // MultiThread

  const calculateHashPromises = [];
  for (let i = 0; i < files.length; i++) {
    if (!readdirdb[model][folderPath]?.files[files[i]]) {
      calculateHashPromises.push(
        calculateHashFileOnWorker(`${folderPath}\\${files[i]}`)
      );
    } else {
      calculateHashPromises.push(
        new Promise((resolve) => {
          resolve('');
        })
      );
    }
  }

  const hashes = await Promise.all(calculateHashPromises);
  */

  for (let i = 0; i < files.length; i++) {
    const fileNameNoExt =
      files[i].substring(0, files[i].lastIndexOf('.')) || files[i];

    if (
      readdirdb[model][folderPath] &&
      readdirdb[model][folderPath].files &&
      readdirdb[model][folderPath].files[fileNameNoExt]
    ) {
      filesHashMap[fileNameNoExt] =
        readdirdb[model][folderPath].files[fileNameNoExt];
    } else {
      filesHashMap[fileNameNoExt] = {
        // hash: hashes[i] as string,
        hash: await calculateHashFile(`${folderPath}\\${files[i]}`),
        modelPath: `${folderPath}\\${files[i]}`,
        fileName: `${fileNameNoExt}`,
      };
    }

    const imageExists = await checkFileExists(
      `${folderPath}\\${fileNameNoExt}.png`
    );
    const modelInfoExists = await checkFileExists(
      `${folderPath}\\${fileNameNoExt}.civitai.info`
    );

    let modelInfo;
    if (!modelInfoExists) {
      try {
        modelInfo = await downloadModelInfoByHash(
          fileNameNoExt,
          filesHashMap[fileNameNoExt].hash,
          folderPath
        );
      } catch (error) {
        console.error(error);
      }
    } else {
      const modelInfoStr = await fs.promises.readFile(
        `${folderPath}\\${fileNameNoExt}.civitai.info`,
        { encoding: 'utf-8' }
      );
      modelInfo = JSON.parse(modelInfoStr);
    }

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
          await downloadImage(
            `${fileNameNoExt}_${c}`,
            modelInfo.images[c].url,
            imagesModelFolder
          );
        }
      }
    }

    if (browserWindow !== null) {
      const progress = ((i + 1) / files.length) * 100;
      const msg = `${files[i]}`;
      browserWindow.webContents.send('models-progress', msg, progress);
    }
  }

  readdirdb = {
    [model]: {
      [folderPath]: {
        files: filesHashMap,
      },
    },
  };

  fs.writeFileSync(readdirdbPathFile, JSON.stringify(readdirdb, null, 2), {
    encoding: 'utf-8',
  });

  return filesHashMap;
};
