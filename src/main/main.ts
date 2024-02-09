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
import fs from 'fs';
import url, { pathToFileURL } from 'url';
import sharp from 'sharp';
import { autoUpdater } from 'electron-updater';
import { Worker } from 'worker_threads';
import log from 'electron-log/main';
import MenuBuilder from './menu';
import { calculateHashFile, checkFolderExists, resolveHtmlPath } from './util';
import SqliteDB from './db';
import { settingsIpc } from './ipc/settings';
import { readFileIpc, readImageIpc } from './ipc/readfile';
import {
  checkModelsToUpdateIpc,
  readModelByNameIpc,
  readModelInfoIpc,
  readModelIpc,
  readModelsIpc,
  readdirModelImagesIpc,
  readdirModelsIpc,
  removeAllModelsTagsIpc,
  tagModelIpc,
  updateModelIpc,
} from './ipc/model';
import { openFolderLinkIpc, openLinkIpc } from './ipc/openLink';
import {
  ImageRow,
  removeImagesIpc,
  getImageIpc,
  getImagesIpc,
  scanImagesIpc,
  updateImageIpc,
  tagImageIpc,
  getImage,
  regenerateThumbnailsIpc,
  removeAllImageTagsIpc,
} from './ipc/image';
import { extractMetadata, parseImageSdMeta } from './exif';
import { getPathsIpc } from './ipc/getPaths';
import { fileAttach } from './ipc/fileAttach';
import {
  saveMDIpc,
  saveImageMDIpc,
  saveImageFromClipboardIpc,
} from './ipc/saveMD';
import { readImageMetadata } from './ipc/metadata';
import { watchFolderIpc } from './ipc/watchFolders';
import { tagIpc } from './ipc/tag';
import { mtagIpc } from './ipc/mtags';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

log.initialize({ preload: true });

ipcMain.handle('readdirModels', (event, model, folderPath) =>
  readdirModelsIpc(mainWindow, event, model, folderPath),
);
ipcMain.handle('getImage', getImageIpc);
ipcMain.handle('getImages', getImagesIpc);
ipcMain.handle('updateImage', updateImageIpc);
ipcMain.handle('removeImages', removeImagesIpc);
ipcMain.handle('scanImages', (event, foldersToWatch: string[]) =>
  scanImagesIpc(mainWindow, event, foldersToWatch),
);
ipcMain.handle('readModels', readModelsIpc);
ipcMain.handle('updateModel', updateModelIpc);
ipcMain.handle('checkModelsToUpdate', (event, type) =>
  checkModelsToUpdateIpc(mainWindow, event, type),
);
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
ipcMain.handle('saveImageFromClipboard', saveImageFromClipboardIpc);
ipcMain.handle('readImageMetadata', readImageMetadata);
ipcMain.handle('watchFolder', watchFolderIpc);
ipcMain.handle('tag', tagIpc);
ipcMain.handle('tagImage', tagImageIpc);
ipcMain.handle('removeAllImageTags', removeAllImageTagsIpc);
ipcMain.handle('removeAllModelsTags', removeAllModelsTagsIpc);
ipcMain.handle('regenerateThumbnails', () =>
  regenerateThumbnailsIpc(mainWindow),
);
ipcMain.handle('mtag', mtagIpc);
ipcMain.handle('tagModel', tagModelIpc);

const worker = new Worker(
  new URL('./workers/watcher.js', pathToFileURL(__filename).toString()),
);

ipcMain.on('ondragstart', (event: IpcMainInvokeEvent, filePath: string) => {
  event.sender.startDrag({
    file: filePath,
    icon: path.join(__dirname, 'assets', 'dragAndDropIcon.png'),
  });
});

ipcMain.handle('watchImagesFolder', async () => {
  worker.removeAllListeners();

  const db = await SqliteDB.getInstance().getdb();

  const foldersToWatch: { path: string }[] = await db.all(
    `SELECT * FROM watch_folders`,
  );

  const autoImportImages = await db.get(
    `SELECT value FROM settings WHERE key = $key`,
    {
      $key: 'autoImportImages',
    },
  );

  if (autoImportImages && autoImportImages.value === '0') {
    return;
  }

  worker.postMessage(foldersToWatch);

  worker.on('message', async (detectedFile: string) => {
    try {
      const filePathParse = path.parse(detectedFile);
      const fileBaseName = filePathParse.name;
      const ext = filePathParse.ext;
      if (ext !== '.png') return;

      const file = await fs.promises.readFile(detectedFile);
      const fileNameNoExt = filePathParse.name;
      const exif = extractMetadata(file);
      const metadata = parseImageSdMeta(exif);

      const imagesFolder = filePathParse.dir;
      const imagesFolderExists = await checkFolderExists(imagesFolder);

      if (!imagesFolderExists) {
        await fs.promises.mkdir(imagesFolder);
      }

      const thumbnailsFolder = `${imagesFolder}\\thumbnails`;
      const thumbnailFolderExists = await checkFolderExists(thumbnailsFolder);
      if (!thumbnailFolderExists) {
        await fs.promises.mkdir(thumbnailsFolder);
      }

      const thumbnailDestPath = `${thumbnailsFolder}\\${fileNameNoExt}.thumbnail.webp`;
      await sharp(detectedFile)
        .resize({ height: 400 })
        .withMetadata()
        .toFormat('webp')
        .toFile(thumbnailDestPath);

      const hash = await calculateHashFile(detectedFile);

      const autoTagImportImages = await db.get(
        `SELECT value from settings WHERE key = $key`,
        {
          $key: 'autoTagImportImages',
        },
      );

      const activeTags =
        autoTagImportImages?.value === '1'
          ? await db.get(`SELECT value from settings WHERE key = $key`, {
              $key: 'activeTags',
            })
          : {
              value: '',
            };
      const activeTagsArr =
        activeTags !== '' ? activeTags?.value.split(',') || [] : [];

      let imagesData: ImageRow = {
        hash,
        path: imagesFolder,
        rating: 1,
        model: metadata.model,
        generatedBy: metadata.generatedBy,
        sourcePath: detectedFile,
        name: fileNameNoExt,
        fileName: fileBaseName,
        tags: activeTags?.value
          ? activeTagsArr.map((t: string) => ({
              [t]: t,
            }))
          : {},
      };

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

      try {
        for (let j = 0; j < activeTagsArr.length; j++) {
          await db.run(
            `INSERT INTO images_tags (tagId, imageHash) VALUES ($tagId, $imageHash)`,
            {
              $tagId: activeTagsArr[j],
              $imageHash: imagesData.hash,
            },
          );
        }
      } catch (error) {
        console.error(error);
        log.error(error);
      }

      imagesData = await getImage(imagesData.hash);

      if (mainWindow !== null) {
        mainWindow.webContents.send('detected-add-image', imagesData);
      }
    } catch (error) {
      console.error(error);
      log.error(error);
    }
  });
});

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
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch((error: any) => {
      console.error(error);
      log.error(error);
    });
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
  .catch((error) => {
    log.error(error);
    console.error(error);
  });
