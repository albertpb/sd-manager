import { IpcRendererEvent } from 'electron';
import { Channels } from '../main/preload';

declare global {
  interface Window {
    ipcHandler: Record<Channels, (...args: any[]) => Promise<any>>;
    ipcOn: {
      modelsProgress: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => () => void;
      imagesProgress: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => () => void;
      detectedAddImage: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => () => void;
      duplicatesDetected: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => () => void;
      checkingModelUpdate: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => () => void;
      modelToUpdate: (
        cb: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => () => void;
      startDrag: (fileName: string) => void;
    };

    api: {
      clearCache: () => void;
    };
  }
}

export {};
