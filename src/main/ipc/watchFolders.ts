import { IpcMainInvokeEvent } from 'electron';
import SqliteDB from '../db';

export const watchFolderIpc = async (
  event: IpcMainInvokeEvent,
  action: string,
  payload: string,
) => {
  const db = await SqliteDB.getInstance().getdb();

  switch (action) {
    case 'read': {
      return db.all(`SELECT * FROM watch_folders`);
    }

    case 'add': {
      await db.run(`INSERT INTO watch_folders ('path') VALUES ($path)`, {
        $path: payload,
      });
      break;
    }

    case 'delete': {
      await db.run(`DELETE FROM watch_folders WHERE path = $path`, {
        $path: payload,
      });
      break;
    }

    default: {
      break;
    }
  }

  return null;
};
