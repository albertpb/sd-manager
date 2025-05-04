import { IpcMainInvokeEvent } from 'electron';
import log from 'electron-log/main';
import SqliteDB from '../db';

export type WatchFolder = {
  path: string;
};

export const watchFolderIpc = async (
  event: IpcMainInvokeEvent,
  action: string,
  payload: any,
) => {
  try {
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
        if (payload.removeImages) {
          await db.run(`DELETE FROM images WHERE path LIKE $path`, {
            $path: `${payload.path}%`,
          });
        }

        await db.run(`DELETE FROM watch_folders WHERE path = $path`, {
          $path: payload.path,
        });

        break;
      }

      case 'edit': {
        const imagesPaths = await db.all(
          `SELECT hash, path, sourcePath FROM images WHERE path LIKE $path`,
          {
            $path: `${payload.currentPath}%`,
          },
        );

        for (let i = 0; i < imagesPaths.length; i++) {
          await db.run(
            `UPDATE images SET path = $path, sourcePath = $sourcePath WHERE hash = $hash`,
            {
              $path: imagesPaths[i].path.replace(
                payload.currentPath,
                payload.newPath,
              ),
              $sourcePath: imagesPaths[i].sourcePath.replace(
                payload.currentPath,
                payload.newPath,
              ),
              $hash: imagesPaths[i].hash,
            },
          );
        }

        await db.run(
          `UPDATE watch_folders SET path = $newPath WHERE path = $path`,
          {
            $newPath: payload.newPath,
            $path: payload.currentPath,
          },
        );
        break;
      }

      default: {
        break;
      }
    }

    return null;
  } catch (error) {
    console.error(error);
    log.error(error);
    return null;
  }
};
