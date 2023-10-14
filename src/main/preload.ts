// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

const channels = [
  'getImage',
  'getImages',
  'updateImage',
  'deleteImages',
  'readdirModels',
  'organizeImages',
  'readModels',
  'updateModel',
  'readModel',
  'readModelByName',
  'selectDir',
  'settings',
  'readdirModelImages',
  'readModelInfo',
  'readFile',
  'readImage',
  'openLink',
  'openFolderLink',
  'watchImagesFolder',
  'getPaths',
  'fileAttach',
  'saveMD',
  'saveImageMD',
  'saveImageFromClipboard',
  'readImageMetadata',
] as const;
export type Channels = (typeof channels)[number];

const ipcHandler: Record<string, (...args: any[]) => Promise<any>> =
  channels.reduce((acc: Record<string, any>, channel) => {
    acc[channel] = (...args: any[]) => ipcRenderer.invoke(channel, ...args);
    return acc;
  }, {});

contextBridge.exposeInMainWorld('ipcHandler', ipcHandler);

contextBridge.exposeInMainWorld('ipcOn', {
  modelsProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.on('models-progress', cb),
  rmModelsProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.removeListener('models-progress', cb),
  imagesProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.on('images-progress', cb),
  rmImagesProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.removeListener('images-progress', cb),
  detectedAddImage: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.on('detectedAddImage', cb),
  rmDetectedAddImage: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.removeListener('detectedAddImage', cb),
  duplicatesDetected: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.on('duplicates-detected', cb),
  rmDuplicatesDetected: (
    cb: (event: IpcRendererEvent, ...args: any[]) => any
  ) => ipcRenderer.removeListener('duplicates-detected', cb),
});
