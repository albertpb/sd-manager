// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

const channels = [
  'getImage',
  'getImages',
  'updateImage',
  'readdirModels',
  'organizeImages',
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
  'saveImageFromClipboard',
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
    ipcRenderer.once('models-progress', cb),
  imagesProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.once('images-progress', cb),
  detectedAddImage: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.once('detectedAddImage', cb),
  rmDetectedAddImage: (cb: (event: IpcRendererEvent, ...args: any[]) => any) =>
    ipcRenderer.removeListener('detectedAddImage', cb),
});
