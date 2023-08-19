import fs from 'fs';
import { app, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import {
  checkFileExists,
  calculateHashFile,
  downloadImage,
  downloadModelInfoByHash,
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

  for (let i = 0; i < files.length; i++) {
    const fileNameNoExt =
      files[i].substring(0, files[i].lastIndexOf('.')) || files[i];

    if (readdirdb[model][folderPath].files[files[i]]) {
      filesHashMap[fileNameNoExt] =
        readdirdb[model][folderPath].files[files[i]];
    } else {
      filesHashMap[fileNameNoExt] = {
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

    if (!modelInfoExists) {
      const modelInfo: ModelInfo = await downloadModelInfoByHash(
        fileNameNoExt,
        filesHashMap[fileNameNoExt].hash,
        folderPath
      );

      if (!imageExists) {
        if (modelInfo.images[0]) {
          await downloadImage(
            fileNameNoExt,
            modelInfo.images[0].url,
            folderPath
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
