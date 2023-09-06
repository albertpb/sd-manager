import { IpcMainInvokeEvent } from 'electron';
import SqliteDB from '../db';

export async function getImagesIpc(
  event: IpcMainInvokeEvent,
  modelName: string
) {
  const db = await SqliteDB.getInstance().getdb();
  return db.all(`SELECT * FROM images WHERE model = $modelName`, {
    $modelName: modelName,
  });
}

export async function getImageIpc(event: IpcMainInvokeEvent, hash: string) {
  const db = await SqliteDB.getInstance().getdb();
  return db.get(`SELECT * FROM images WHERE hash = $hash`, {
    $hash: hash,
  });
}

export async function updateImageIpc(
  event: IpcMainInvokeEvent,
  hash: string,
  field: string,
  value: string
) {
  const db = await SqliteDB.getInstance().getdb();
  return db.run(`UPDATE images SET ${field} = $value`, {
    $value: value,
  });
}
