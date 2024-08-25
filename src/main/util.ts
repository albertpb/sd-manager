/* eslint import/prefer-default-export: off */
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import path from 'path';
import log from 'electron-log/main';
import { URL } from 'url';
import { createBLAKE3 } from 'hash-wasm';
import { convertPath } from '../renderer/utils';
import {
  ImageMetaData,
  ModelCivitaiInfo,
  ModelInfo,
  ModelInfoImage,
} from './interfaces';
import HashWorkerManager from './WorkerManagers/HashWorkerManager';
import ImageMetadataWorkerManager from './WorkerManagers/ImageMetadataWorkerManager';
import ThumbnailWorkerManager from './WorkerManagers/ThumbnailWorkerManager';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export function checkFileExists(file: string) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export function checkFolderExists(folder: string) {
  return fs.promises
    .access(folder)
    .then(() => true)
    .catch(() => false);
}

export function calculateHashFile(filePath: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const hashsum = await createBLAKE3();

    const fileExists = await checkFileExists(filePath);
    if (!fileExists) {
      resolve('');
      return;
    }

    try {
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => {
        hashsum.update(data);
      });

      stream.on('end', () => {
        const hash = hashsum.digest('hex');
        return resolve(hash);
      });
    } catch (error) {
      console.error(error);
      log.error(error);
      reject(error);
    }
  });
}

export async function calculateHashFileOnWorker(
  filePath: string,
  algorithm: 'blake3' | 'sha256' = 'blake3',
): Promise<string> {
  const hash = await HashWorkerManager.getInstance().sendMessage({
    filePath,
    algorithm,
  });
  return hash;
}

export async function makeThumbnailOnWorker(
  filePath: string,
  thumbnailDestPath: string,
): Promise<null> {
  await ThumbnailWorkerManager.getInstance().sendMessage({
    imageFile: filePath,
    thumbnailDestPath,
  });
  return null;
}

export async function parseMetadataOnWorker(
  filePath: string,
): Promise<Record<string, ImageMetaData> | null> {
  const metadata =
    await ImageMetadataWorkerManager.getInstance().sendMessage(filePath);
  return metadata;
}

export async function downloadModelInfoByHash(
  modelName: string,
  hash: string,
  downloadDir: string,
) {
  try {
    const response = await axios.get(
      `https://civitai.com/api/v1/model-versions/by-hash/${hash}`,
    );

    await fs.promises.writeFile(
      convertPath(`${downloadDir}\\${modelName}.civitai.info`, os.platform()),
      JSON.stringify(response.data, null, 2),
      { encoding: 'utf-8', flag: 'w' },
    );

    return response.data;
  } catch (error) {
    console.log(`failed to download civitai info model ${modelName}`);
    log.info(`failed to download civitai info model ${modelName}`);
    await fs.promises.writeFile(
      convertPath(`${downloadDir}\\${modelName}.civitai.info`, os.platform()),
      '{}',
      { encoding: 'utf-8' },
    );

    throw error;
  }
}

export const getModelInfo = async (
  modelId: number,
  modelName?: string,
  downloadDir?: string,
): Promise<ModelInfo> => {
  const filePath = convertPath(
    `${downloadDir}\\${modelName}.civitai.model.info`,
    os.platform(),
  );
  try {
    if (modelName && downloadDir) {
      const fileExists = await checkFileExists(filePath);
      if (fileExists) {
        const data = await fs.promises.readFile(filePath, {
          encoding: 'utf-8',
        });
        return JSON.parse(data);
      }
    }

    const response = await axios.get(
      `https://civitai.com/api/v1/models/${modelId}`,
    );

    if (modelName && downloadDir) {
      await fs.promises.writeFile(
        convertPath(
          `${downloadDir}\\${modelName}.civitai.model.info`,
          os.platform(),
        ),
        JSON.stringify(response.data, null, 2),
        { encoding: 'utf-8' },
      );
    }

    return response.data;
  } catch (error) {
    console.log(`failed to download civitai info modelInfo ${modelName}`);
    log.info(`failed to download civitai info modelInfo ${modelName}`);
    if (modelName && downloadDir) {
      await fs.promises.writeFile(
        convertPath(
          `${downloadDir}\\${modelName}.civitai.model.info`,
          os.platform(),
        ),
        '{}',
        { encoding: 'utf-8' },
      );
    }

    throw error;
  }
};

export async function downloadImage(
  fileName: string,
  modelInfoImage: ModelInfoImage,
  savePath: string,
  resolution = 1024,
) {
  let fileExists = await checkFileExists(
    convertPath(`${savePath}\\${fileName}.png`, os.platform()),
  );

  if (!fileExists) {
    const writer = fs.createWriteStream(
      convertPath(`${savePath}\\${fileName}.png`, os.platform()),
    );

    const imageUrl = modelInfoImage.url.replace(
      '/width=d+/',
      `width=${resolution}`,
    );

    const response = await axios.get(imageUrl, {
      responseType: 'stream',
    });

    response.data.pipe(writer);

    const p = new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    await p;
  }

  fileExists = await checkFileExists(
    convertPath(`${savePath}\\${fileName}.json`, os.platform()),
  );

  if (!fileExists) {
    fs.writeFileSync(
      convertPath(`${savePath}\\${fileName}.json`, os.platform()),
      JSON.stringify(modelInfoImage, null, 4),
      { encoding: 'utf-8' },
    );
  }
}

export async function readModelInfoFile(filePath: string) {
  const file = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
  return JSON.parse(file) as ModelCivitaiInfo;
}

export const deleteModelFiles = (filePath: string, fileNameNoExt: string) => {
  const folderPath = path.dirname(filePath);
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    log.info(error);
    console.log(error);
  }

  try {
    fs.rmdirSync(convertPath(`${folderPath}\\${fileNameNoExt}`, os.platform()));
  } catch (error) {
    log.info(error);
    console.log(error);
  }

  try {
    fs.unlinkSync(
      convertPath(
        `${folderPath}\\${fileNameNoExt}.civitai.info`,
        os.platform(),
      ),
    );
  } catch (error) {
    log.info(error);
    console.log(error);
  }

  try {
    fs.unlinkSync(
      convertPath(`${folderPath}\\${fileNameNoExt}.preview.png`, os.platform()),
    );
  } catch (error) {
    log.info(error);
    console.log(error);
  }
};

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function retryPromise<T>(
  promiseFactory: () => Promise<T>,
  maxAttempts: number,
  delayMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function attempt() {
      promiseFactory()
        .then(resolve)
        .catch((error) => {
          console.log(error);
          log.info(error);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(attempt, delayMs); // Retry after a delay
          } else {
            reject(error); // Reject if maxAttempts reached
          }
        });
    }

    attempt(); // Start the first attempt
  });
}

export function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const folderExists = fs.existsSync(dirPath);

  if (folderExists) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
      if (file.isDirectory()) {
        arrayOfFiles = getAllFiles(
          convertPath(`${file.path}\\${file.name}`, os.platform()),
          arrayOfFiles,
        );
      } else if (file.isFile()) {
        arrayOfFiles.push(
          convertPath(`${file.path}\\${file.name}`, os.platform()),
        );
      }
    });

    return arrayOfFiles;
  }
  return [];
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunkedArray: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    chunkedArray.push(chunk);
  }

  return chunkedArray;
}

export async function hashFilesInBackground(
  files: string[],
  progressCb?: (progress: number) => any,
  algorithm: 'sha256' | 'blake3' = 'blake3',
) {
  if (progressCb) {
    progressCb(0.1);
  }

  let filesHashes: Record<string, string> = {};
  const filesChunks = chunkArray(files, HashWorkerManager.getInstance().size());

  for (let i = 0; i < filesChunks.length; i++) {
    const promises: Promise<Record<string, string>>[] = [];
    for (let j = 0; j < filesChunks[i].length; j++) {
      promises.push(
        (async () => {
          const hash = await calculateHashFileOnWorker(
            filesChunks[i][j],
            algorithm,
          );
          if (hash !== null) {
            return {
              [filesChunks[i][j]]: hash,
            };
          }
          return {
            [filesChunks[i][j]]: '',
          };
        })(),
      );
    }
    const hashes = await Promise.all(promises);

    for (let j = 0; j < hashes.length; j++) {
      filesHashes = {
        ...filesHashes,
        ...hashes[j],
      };
    }

    const progress = ((i + 1) / filesChunks.length) * 100;
    if (progressCb) {
      progressCb(progress);
    }
  }

  return filesHashes;
}

export async function makeThumbnails(
  files: [string, string][],
  progressCb?: (progress: number) => any,
) {
  if (progressCb) {
    progressCb(0.1);
  }

  const filesChunks = chunkArray(
    files,
    ThumbnailWorkerManager.getInstance().size(),
  );
  for (let i = 0; i < filesChunks.length; i++) {
    const promises: Promise<null>[] = [];
    for (let j = 0; j < filesChunks[i].length; j++) {
      promises.push(
        makeThumbnailOnWorker(filesChunks[i][j][0], filesChunks[i][j][1]),
      );
    }
    await Promise.all(promises);

    const progress = ((i + 1) / filesChunks.length) * 100;
    if (progressCb) {
      progressCb(progress);
    }
  }
}

export async function parseImagesMetadata(
  files: string[],
  progressCb?: (progress: number) => any,
) {
  if (progressCb) {
    progressCb(0.1);
  }

  const filesChunks = chunkArray(
    files,
    ImageMetadataWorkerManager.getInstance().size(),
  );
  let filesMetadata: Record<string, ImageMetaData> = {};
  for (let i = 0; i < filesChunks.length; i++) {
    const promises: Promise<Record<string, ImageMetaData> | null>[] = [];
    for (let j = 0; j < filesChunks[i].length; j++) {
      promises.push(parseMetadataOnWorker(filesChunks[i][j]));
    }
    const response = await Promise.all(promises);
    for (let j = 0; j < response.length; j++) {
      if (response[j] !== null) {
        filesMetadata = {
          ...filesMetadata,
          ...response[j],
        };
      }
    }

    const progress = ((i + 1) / filesChunks.length) * 100;
    if (progressCb) {
      progressCb(progress);
    }
  }

  return filesMetadata;
}
