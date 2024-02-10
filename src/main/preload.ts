// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import {
  IpcRendererEvent,
  contextBridge,
  ipcRenderer,
  webFrame,
} from 'electron';

const channels = [
  'getImage',
  'getImages',
  'updateImage',
  'removeImages',
  'readdirModels',
  'scanImages',
  'readModels',
  'updateModel',
  'checkModelsToUpdate',
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
  'checkModelsToUpdate',
  'watchFolder',
  'tag',
  'tagImage',
  'regenerateThumbnails',
  'mtag',
  'tagModel',
  'removeAllImageTags',
  'removeAllModelsTags',
  'readFuseIndex',
  'saveFuseIndex',
  'getImagesHashByPositivePrompt',
  'getImagesHashByNegativePrompt',
] as const;
export type Channels = (typeof channels)[number];

const ipcHandler: Record<string, (...args: any[]) => Promise<any>> =
  channels.reduce((acc: Record<string, any>, channel) => {
    acc[channel] = (...args: any[]) => ipcRenderer.invoke(channel, ...args);
    return acc;
  }, {});

contextBridge.exposeInMainWorld('ipcHandler', ipcHandler);

contextBridge.exposeInMainWorld('ipcOn', {
  modelsProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) => {
    ipcRenderer.on('models-progress', cb);
    return () => ipcRenderer.removeListener('models-progress', cb);
  },
  imagesProgress: (cb: (event: IpcRendererEvent, ...args: any[]) => any) => {
    ipcRenderer.on('images-progress', cb);
    return () => ipcRenderer.removeListener('images-progress', cb);
  },
  detectedAddImage: (cb: (event: IpcRendererEvent, ...args: any[]) => any) => {
    ipcRenderer.on('detected-add-image', cb);
    return () => ipcRenderer.removeListener('detected-add-image', cb);
  },
  duplicatesDetected: (
    cb: (event: IpcRendererEvent, ...args: any[]) => any,
  ) => {
    ipcRenderer.on('duplicates-detected', cb);
    return () => ipcRenderer.removeListener('duplicates-detected', cb);
  },
  checkingModelUpdate: (
    cb: (event: IpcRendererEvent, ...args: any[]) => any,
  ) => {
    ipcRenderer.on('checking-model-update', cb);
    return () => ipcRenderer.removeListener('checking-model-update', cb);
  },
  modelToUpdate: (cb: (event: IpcRendererEvent, ...args: any[]) => any) => {
    ipcRenderer.on('model-need-update', cb);
    return () => ipcRenderer.removeListener('model-need-update', cb);
  },
  startDrag: (fileName: string) => {
    ipcRenderer.send('ondragstart', fileName);
  },
});

contextBridge.exposeInMainWorld('api', {
  clearCache() {
    webFrame.clearCache();
  },
});
