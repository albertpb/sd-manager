import os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';
import { ImageMetaData } from '../interfaces';

export default class ImageMetadataWorkerManager {
  // eslint-disable-next-line no-use-before-define
  private static instance: ImageMetadataWorkerManager | null = null;

  private MAX_SIZE = os.cpus().length;

  private workers: Worker[] = [];

  private activeWorker = 0;

  // eslint-disable-next-line
  private constructor() {
    for (let i = 0; i < this.MAX_SIZE; i++) {
      const worker = new Worker(
        path.resolve(__dirname, '../workers/imageMetadata.js'),
      );
      this.workers.push(worker);
    }
  }

  public static getInstance(): ImageMetadataWorkerManager {
    if (ImageMetadataWorkerManager.instance === null) {
      ImageMetadataWorkerManager.instance = new ImageMetadataWorkerManager();
    }

    return ImageMetadataWorkerManager.instance;
  }

  public size(): number {
    return this.workers.length;
  }

  private nextWorker() {
    if (this.activeWorker >= this.size() - 1) {
      this.activeWorker = 0;
    } else {
      this.activeWorker += 1;
    }
  }

  public sendMessage(payload: any): Promise<Record<string, ImageMetaData>> {
    this.nextWorker();
    return new Promise((resolve, reject) => {
      const activeWorker = this.activeWorker;
      this.workers[activeWorker].postMessage(payload);

      const listener = (message: { type: string; message: any }) => {
        this.workers[activeWorker].removeListener('message', listener);
        if (message.type === 'result') {
          resolve(message.message);
        } else if (message.type === 'error') {
          reject(message.message);
        }
      };

      this.workers[activeWorker].on('message', listener);
    });
  }
}
