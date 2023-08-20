import fs from 'fs';
import { app, IpcMainInvokeEvent } from 'electron';
import { checkFileExists } from '../util';

export type StoreAction = 'save' | 'read';

export const getStorage = async (
  action: StoreAction,
  key: string,
  data?: string
) => {
  const userDataPath = `${app.getPath('userData')}`;
  const settingsPathFile = `${userDataPath}\\storage.json`;
  const settingsExists = await checkFileExists(settingsPathFile);
  let settings;

  if (settingsExists) {
    settings = fs.readFileSync(settingsPathFile, { encoding: 'utf-8' });
    settings = JSON.parse(settings);
  } else {
    settings = {};
  }

  switch (action) {
    case 'save': {
      settings[key] = data;
      fs.writeFileSync(settingsPathFile, JSON.stringify(settings), {
        encoding: 'utf-8',
      });
      break;
    }

    case 'read': {
      return settings[key];
    }

    default: {
      break;
    }
  }

  return null;
};

export const storageIpc = async (
  event: IpcMainInvokeEvent,
  action: StoreAction,
  key: string,
  data: string
) => {
  const storage = await getStorage(action, key, data);

  return storage;
};
