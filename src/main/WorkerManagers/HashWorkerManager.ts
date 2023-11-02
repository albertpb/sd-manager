import os from 'os';
import { URL, pathToFileURL } from 'url';
import { Worker } from 'worker_threads';

export default class HashWorkerManager {
  // eslint-disable-next-line no-use-before-define
  private static instance: HashWorkerManager | null = null;

  private MAX_SIZE = os.cpus().length - 2;

  private workers: Worker[] = [];

  private activeWorker = 0;

  // eslint-disable-next-line
  private constructor() {
    for (let i = 0; i < this.MAX_SIZE; i++) {
      const worker = new Worker(
        new URL(
          '../workers/calculateHash.js',
          pathToFileURL(__filename).toString(),
        ),
      );
      this.workers.push(worker);
    }
  }

  public static getInstance(): HashWorkerManager {
    if (HashWorkerManager.instance === null) {
      HashWorkerManager.instance = new HashWorkerManager();
    }

    return HashWorkerManager.instance;
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

  public sendMessage(payload: any): Promise<string> {
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
