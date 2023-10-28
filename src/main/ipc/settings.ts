import { IpcMainInvokeEvent } from 'electron';
import SqliteDB from '../db';

export type StoreAction = 'save' | 'read' | 'readAll';

export const settingsDB = async (
  action: StoreAction,
  key?: string,
  data?: string,
) => {
  const db = await SqliteDB.getInstance().getdb();

  switch (action) {
    case 'save': {
      await db.run(
        `INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = ? WHERE key = ?`,
        {
          1: key,
          2: data,
          3: data,
          4: key,
        },
      );
      break;
    }

    case 'read': {
      return db.get(`SELECT value FROM settings WHERE key = ?`, {
        1: key,
      });
    }

    case 'readAll': {
      const result = await db.all('SELECT * FROM settings');
      return result.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
    }

    default: {
      break;
    }
  }

  return null;
};

export const settingsIpc = async (
  event: IpcMainInvokeEvent,
  action: StoreAction,
  key: string,
  data?: string,
) => {
  return settingsDB(action, key, data);
};
