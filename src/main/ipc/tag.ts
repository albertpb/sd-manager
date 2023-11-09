import { IpcMainInvokeEvent } from 'electron';
import log from 'electron-log/main';
import SqliteDB from '../db';

export type Tag = {
  id: string;
  label: string;
  color: string;
  bgColor: string;
};

export const tagIpc = async (
  event: IpcMainInvokeEvent,
  action: string,
  payload: any,
) => {
  try {
    const db = await SqliteDB.getInstance().getdb();

    switch (action) {
      case 'read': {
        return db.all(`SELECT * FROM tags`);
      }

      case 'add': {
        await db.run(
          `INSERT INTO tags (id, label, color, bgColor) VALUES ($id, $label, $color, $bgColor)`,
          {
            $id: payload.id,
            $label: payload.label,
            $color: payload.color,
            $bgColor: payload.bgColor,
          },
        );

        const activeTags = await db.get(
          `SELECT value FROM settings WHERE key = $key`,
          {
            $key: 'activeTags',
          },
        );

        if (activeTags?.value) {
          await db.run(`UPDATE settings SET value = $tagId WHERE key = $key`, {
            $tagId: `${activeTags.value},${payload.id}`,
            $key: 'activeTags',
          });
        } else {
          await db.run(
            `INSERT INTO settings (key, value) VALUES ($key, $value)`,
            {
              $key: 'activeTags',
              $value: payload.id,
            },
          );
        }
        break;
      }

      case 'delete': {
        const activeTags = await db.get(
          `SELECT value FROM settings WHERE key = $key`,
          {
            $key: 'activeTags',
          },
        );

        const activeTagsArr = activeTags.value.split(',');
        const index = activeTagsArr.findIndex((t: string) => t === payload.id);

        if (index !== -1) {
          activeTagsArr.splice(index, 1);

          await db.run(
            `UPDATE settings SET value = $activeTags WHERE key = $key`,
            {
              $activeTag: activeTagsArr.join(','),
              $key: 'activeTags',
            },
          );
        }
        await db.run(`DELETE FROM tags WHERE id = $id`, {
          $id: payload.id,
        });

        break;
      }

      case 'edit': {
        await db.run(
          `UPDATE tags SET label = $label, color = $color, bgColor = $bgColor WHERE id = $id`,
          {
            $id: payload.id,
            $label: payload.label,
            $color: payload.color,
            $bgColor: payload.bgColor,
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
