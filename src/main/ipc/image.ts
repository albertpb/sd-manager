import fs from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import SqliteDB from '../db';

export async function getImagesIpc(
  event: IpcMainInvokeEvent,
  modelName: string | undefined
) {
  const db = await SqliteDB.getInstance().getdb();

  if (modelName) {
    return db.all(
      `SELECT * FROM images WHERE model = $modelName AND deleted = 0 ORDER BY rating DESC, rowid DESC`,
      {
        $modelName: modelName,
      }
    );
  }

  return db.all(
    `SELECT * FROM images WHERE deleted = 0 ORDER BY rating DESC, rowid DESC`
  );
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
  return db.run(`UPDATE images SET ${field} = $value WHERE hash = $hash`, {
    $value: value,
    $hash: hash,
  });
}

export async function deleteImages(
  event: IpcMainInvokeEvent,
  images: Record<string, boolean>
) {
  const db = await SqliteDB.getInstance().getdb();
  const arr = Object.keys(images);

  for (let i = 0; i < arr.length; i++) {
    const hash = arr[i];
    const row = await db.get(`SELECT * FROM images WHERE hash = $hash`, {
      $hash: hash,
    });

    try {
      fs.unlinkSync(`${row.path}\\${row.fileName}`);
      fs.unlinkSync(`${row.path}\\${row.name}.thumbnail.png`);
      fs.unlinkSync(`${row.path}\\${row.name}`);
    } catch (error) {
      console.log(error);
    }

    await db.run(`UPDATE images SET deleted = 1 WHERE hash = $hash`, {
      $hash: hash,
    });
  }
}
