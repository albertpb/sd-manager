/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  protocol,
  net,
  IpcMainInvokeEvent,
} from 'electron';
import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs';
import url from 'url';
import sharp from 'sharp';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import {
  calculateHashFile,
  checkFolderExists,
  getFilenameNoExt,
  resolveHtmlPath,
} from './util';
import SqliteDB from './db';
import { settingsDB, settingsIpc } from './ipc/settings';
import { readFileIpc, readImageIpc } from './ipc/readfile';
import { ImageRow, organizeImagesIpc } from './ipc/organizeImages';
import {
  readModelByNameIpc,
  readModelInfoIpc,
  readModelIpc,
  readModelsIpc,
  readdirModelImagesIpc,
  readdirModelsIpc,
  updateModelIpc,
} from './ipc/model';
import { openFolderLinkIpc, openLinkIpc } from './ipc/openLink';
import {
  deleteImages,
  getImageIpc,
  getImagesIpc,
  updateImageIpc,
} from './ipc/image';
import {
  extractMetadata,
  parseAutomatic1111Meta,
  parseComfyUiMeta,
} from './exif';
import { getPathsIpc } from './ipc/getPaths';
import { fileAttach } from './ipc/fileAttach';
import { saveMDIpc, saveImageMDIpc } from './ipc/saveMD';
import { readImageMetadata } from './ipc/metadata';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('readdirModels', (event, model, folderPath) =>
  readdirModelsIpc(mainWindow, event, model, folderPath),
);
ipcMain.handle('getImage', getImageIpc);
ipcMain.handle('getImages', getImagesIpc);
ipcMain.handle('updateImage', updateImageIpc);
ipcMain.handle('deleteImages', deleteImages);
ipcMain.handle('organizeImages', () => organizeImagesIpc(mainWindow));
ipcMain.handle('readModels', readModelsIpc);
ipcMain.handle('updateModel', updateModelIpc);
ipcMain.handle('readModel', readModelIpc);
ipcMain.handle('readModelByName', readModelByNameIpc);
ipcMain.handle('settings', settingsIpc);
ipcMain.handle('readModelInfo', readModelInfoIpc);
ipcMain.handle('readdirModelImages', readdirModelImagesIpc);
ipcMain.handle('readFile', readFileIpc);
ipcMain.handle('readImage', readImageIpc);
ipcMain.handle('openLink', openLinkIpc);
ipcMain.handle('openFolderLink', openFolderLinkIpc);
ipcMain.handle('getPaths', getPathsIpc);
ipcMain.handle('fileAttach', fileAttach);
ipcMain.handle('saveMD', saveMDIpc);
ipcMain.handle('saveImageMD', saveImageMDIpc);
ipcMain.handle('readImageMetadata', readImageMetadata);

let watcherImagesFolder: FSWatcher | null = null;
ipcMain.handle(
  'watchImagesFolder',
  async (event: IpcMainInvokeEvent, folderToWatch: string) => {
    const folderExists = await checkFolderExists(folderToWatch);

    const response = await settingsDB('read', 'imagesDestPath');
    const imagesDestPath = response?.value;

    if (folderExists && imagesDestPath) {
      if (watcherImagesFolder !== null) {
        watcherImagesFolder.close();
      }

      watcherImagesFolder = chokidar.watch(folderToWatch, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: true,
      });

      watcherImagesFolder.on('add', async (detectedFile: string) => {
        console.log('detedted file ', detectedFile);

        const fileBaseName = `${path.basename(detectedFile)}`;
        const fileNameNoExt = getFilenameNoExt(fileBaseName);
        const ext = fileBaseName.split('.').pop();
        if (ext !== 'png') return;

        const imagesDestPathExists = await checkFolderExists(imagesDestPath);

        console.log(
          'imagesDestPathExists',
          imagesDestPath,
          imagesDestPathExists,
        );

        if (imagesDestPathExists) {
          const file = fs.readFileSync(detectedFile);
          const exif = extractMetadata(file);
          let metadata = null;
          if (exif.parameters) {
            metadata = parseAutomatic1111Meta(exif.parameters);
          } else if (exif.workflow) {
            metadata = parseComfyUiMeta(exif.workflow);
          }

          if (metadata && metadata.model) {
            const imagesFolder = `${imagesDestPath}\\${metadata.model}`;
            const imagesFolderExists = await checkFolderExists(imagesFolder);

            if (!imagesFolderExists) {
              fs.mkdirSync(imagesFolder);
            }

            fs.copyFileSync(detectedFile, `${imagesFolder}\\${fileBaseName}`);

            const thumbnailDestPath = `${imagesFolder}\\${fileNameNoExt}.thumbnail.png`;
            await sharp(detectedFile)
              .resize({ height: 400 })
              .withMetadata()
              .toFile(thumbnailDestPath);

            const hash = await calculateHashFile(detectedFile);

            const imagesData: ImageRow = {
              hash,
              path: imagesFolder,
              rating: 1,
              model: metadata.model,
              generatedBy: metadata.generatedBy,
              sourcePath: detectedFile,
              name: fileNameNoExt,
              fileName: fileBaseName,
              deleted: 0,
            };

            const db = await SqliteDB.getInstance().getdb();
            await db.run(
              `INSERT INTO images(hash, path, rating, model, generatedBy, sourcePath, name, fileName) VALUES($hash, $path, $rating, $model, $generatedBy, $sourcePath, $name, $fileName)`,
              {
                $hash: imagesData.hash,
                $path: imagesData.path,
                $rating: imagesData.rating,
                $model: imagesData.model,
                $generatedBy: imagesData.generatedBy,
                $sourcePath: imagesData.sourcePath,
                $name: imagesData.name,
                $fileName: imagesData.fileName,
              },
            );

            if (mainWindow !== null) {
              mainWindow.webContents.send('detectedAddImage', imagesData);
            }
          }
        }
      });
    }
  },
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  ipcMain.handle('selectDir', async () => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
      });

      if (!result.canceled && result.filePaths[0] !== '') {
        return result.filePaths[0];
      }
    }
    return null;
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  mainWindow.on('closed', async () => {
    mainWindow = null;

    await SqliteDB.getInstance()
      .getdb()
      .then((db) => db.close());

    if (watcherImagesFolder) {
      watcherImagesFolder.close();
    }
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    protocol.handle('sd', (request) => {
      return net.fetch(
        `file:///${
          url.pathToFileURL(decodeURI(request.url.slice('sd:///'.length)))
            .pathname
        }`,
      );
    });

    await SqliteDB.getInstance().initdb();

    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
