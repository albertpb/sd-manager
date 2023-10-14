import { IpcRendererEvent } from 'electron';
import { Channels } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    ipcHandler: Record<Channels, (...args: any[]) => Promise<any>>;
    ipcOn: {
      modelsProgress: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      rmModelsProgress: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      imagesProgress: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      rmImagesProgress: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      detectedAddImage: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      rmDetectedAddImage: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      duplicatesDetected: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
      rmDuplicatesDetected: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void
      ) => any;
    };
  }
}

export {};
