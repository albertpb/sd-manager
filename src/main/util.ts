/* eslint import/prefer-default-export: off */
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { Worker, isMainThread } from 'worker_threads';
import { URL } from 'url';
import { createBLAKE3 } from 'hash-wasm';
import { ImageMetaData, ModelCivitaiInfo, ModelInfo } from './interfaces';

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
      reject(error);
    }
  });
}

export function calculateHashFileOnWorker(
  filePath: string,
): Promise<string> | null {
  if (isMainThread) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.resolve(__dirname, './tasks/calculateHash.js'),
      );

      worker.on('message', (message) => {
        if (message.type === 'hashResult') {
          resolve(message.hash);
        } else if (message.type === 'error') {
          reject(message.message);
        }
      });

      worker.postMessage(filePath);
    });
  }
  return null;
}

export async function makeThumbnailOnWorker(
  filePath: string,
  thumbnailDestPath: string,
): Promise<null> {
  if (isMainThread) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.resolve(__dirname, './tasks/thumbnails.js'),
      );

      worker.on('message', (message) => {
        if (message === 'done') {
          resolve(null);
        } else {
          reject();
        }
      });

      worker.postMessage({ imageFile: filePath, thumbnailDestPath });
    });
  }
  return null;
}

export async function parseMetadataOnWorker(
  filePath: string,
): Promise<Record<string, ImageMetaData> | null> {
  if (isMainThread) {
    return new Promise((resolve) => {
      const worker = new Worker(
        path.resolve(__dirname, './tasks/imageMetadata.js'),
      );

      worker.on('message', (message) => {
        resolve(message);
      });
      worker.postMessage(filePath);
    });
  }
  return null;
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
      `${downloadDir}\\${modelName}.civitai.info`,
      JSON.stringify(response.data, null, 2),
      { encoding: 'utf-8', flag: 'w' },
    );

    return response.data;
  } catch (error) {
    await fs.promises.writeFile(
      `${downloadDir}\\${modelName}.civitai.info`,
      '{}',
      { encoding: 'utf-8' },
    );

    throw error;
  }
}

export async function downloadImage(
  fileName: string,
  url: string,
  savePath: string,
  resolution = 1024,
) {
  const fileExists = await checkFileExists(`${savePath}\\${fileName}.png`);

  if (!fileExists) {
    const writer = fs.createWriteStream(`${savePath}\\${fileName}.png`);

    const imageUrl = url.replace('/width=d+/', `width=${resolution}`);

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
    console.log(error);
  }

  try {
    fs.rmdirSync(`${folderPath}\\${fileNameNoExt}`);
  } catch (error) {
    console.log(error);
  }

  try {
    fs.unlinkSync(`${folderPath}\\${fileNameNoExt}.civitai.info`);
  } catch (error) {
    console.log(error);
  }

  try {
    fs.unlinkSync(`${folderPath}\\${fileNameNoExt}.preview.png`);
  } catch (error) {
    console.log(error);
  }
};

export const getModelInfo = async (modelId: number): Promise<ModelInfo> => {
  const response = await axios.get(
    `https://civitai.com/api/v1/models/${modelId}`,
  );
  return response.data;
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
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (file.isDirectory()) {
      arrayOfFiles = getAllFiles(`${file.path}\\${file.name}`, arrayOfFiles);
    } else if (file.isFile()) {
      arrayOfFiles.push(`${file.path}\\${file.name}`);
    }
  });

  return arrayOfFiles;
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
  threads: number,
  progressCb?: (progress: number) => any,
) {
  if (progressCb) {
    progressCb(0);
  }

  const filesHashes: Record<string, string> = {};
  const filesChunks = chunkArray(files, threads);

  for (let i = 0; i < filesChunks.length; i++) {
    const promises: Promise<Record<string, string>>[] = [];
    for (let j = 0; j < filesChunks[i].length; j++) {
      promises.push(
        (async () => {
          const hash = await calculateHashFileOnWorker(filesChunks[i][j]);
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
      Object.assign(filesHashes, hashes[j]);
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
  threads: number,
  progressCb?: (progress: number) => any,
) {
  if (progressCb) {
    progressCb(0);
  }

  const filesChunks = chunkArray(files, threads);
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
  threads: number,
  progressCb?: (progress: number) => any,
) {
  if (progressCb) {
    progressCb(0);
  }

  const filesChunks = chunkArray(files, threads);
  const filesMetadata: Record<string, ImageMetaData> = {};
  for (let i = 0; i < filesChunks.length; i++) {
    const promises: Promise<Record<string, ImageMetaData> | null>[] = [];
    for (let j = 0; j < filesChunks[i].length; j++) {
      promises.push(parseMetadataOnWorker(filesChunks[i][j]));
    }
    const response = await Promise.all(promises);
    for (let j = 0; j < response.length; j++) {
      if (response[j] !== null) {
        Object.assign(filesMetadata, response[j]);
      }
    }

    const progress = ((i + 1) / filesChunks.length) * 100;
    if (progressCb) {
      progressCb(progress);
    }
  }

  return filesMetadata;
}
