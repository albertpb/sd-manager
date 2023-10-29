/* eslint import/prefer-default-export: off */
import { Worker } from 'worker_threads';
import { URL } from 'url';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ModelCivitaiInfo, ModelInfo } from './interfaces';

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

export function calculateHashFile(
  filePath: string,
  algorithm = 'sha256',
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const shasum = crypto.createHash(algorithm);

    const fileExists = await checkFileExists(filePath);
    if (!fileExists) {
      resolve('');
      return;
    }

    try {
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => {
        shasum.update(data);
      });

      stream.on('end', () => {
        const hash = shasum.digest('hex');
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
  algorithm = 'sha256',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.resolve(__dirname, './tasks/calculateHash.js'),
      {
        workerData: {
          filePath,
          algorithm,
        },
      },
    );

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
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

export function splitOutsideQuotes(input: string): string[] {
  const regex = /([ 0-9a-zA-Z]+: "[^"]+")/g;
  const parts = input.match(regex);
  let arr: string[] = [];
  if (parts !== null) {
    arr = arr.concat(parts.map((part) => part.trim()));
  }
  const cleanTxt = input
    .replace(regex, '')
    .split(',')
    .reduce((acc: string[], part) => {
      const p = part.trim();
      if (p !== '') acc.push(p);
      return acc;
    }, []);
  return arr.concat(cleanTxt);
}

export const getFilenameNoExt = (fileName: string) => {
  return fileName.substring(0, fileName.lastIndexOf('.'));
};

export const getFileNameExt = (fileName: string) => {
  return fileName.split('.').pop();
};

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
    } else {
      arrayOfFiles.push(`${file.path}\\${file.name}`);
    }
  });

  return arrayOfFiles;
}
