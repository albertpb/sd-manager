import { IpcMainInvokeEvent } from 'electron';
import SqliteDB from '../db';

export async function getImagesIpc(
  event: IpcMainInvokeEvent,
  modelName: string | undefined
) {
  const db = await SqliteDB.getInstance().getdb();

  if (modelName) {
    return db.all(
      `SELECT * FROM images WHERE model = $modelName ORDER BY rating DESC, rowid DESC`,
      {
        $modelName: modelName,
      }
    );
  }

  return db.all(`SELECT * FROM images ORDER BY rating DESC, rowid DESC`);
}

export async function getImageIpc(event: IpcMainInvokeEvent, hash: string) {
  const db = await SqliteDB.getInstance().getdb();
  return db.get(
    `SELECT * FROM images WHERE hash = $hash ORDER BY rating DESC, rowid DESC`,
    {
      $hash: hash,
    }
  );
}

export async function updateImageIpc(
  event: IpcMainInvokeEvent,
  hash: string,
  field: string,
  value: string
) {
  const db = await SqliteDB.getInstance().getdb();
  return db.run(`UPDATE images SET ${field} = $value WHERE hash = $hash`, {
    $value: value,
    $hash: hash,
  });
}
