import { IpcMainInvokeEvent } from 'electron';
import log from 'electron-log/main';
import SqliteDB from '../db';

export const mtagIpc = async (
  event: IpcMainInvokeEvent,
  action: string,
  payload: any,
) => {
  try {
    const db = await SqliteDB.getInstance().getdb();

    switch (action) {
      case 'read': {
        const mtags = await db.all(`SELECT * FROM mtags`);
        return mtags.reduce((acc, tag) => {
          acc[tag.id] = tag;
          return acc;
        }, {});
      }

      case 'add': {
        await db.run(
          `INSERT INTO mtags (id, label, color, bgColor) VALUES ($id, $label, $color, $bgColor)`,
          {
            $id: payload.id,
            $label: payload.label,
            $color: payload.color,
            $bgColor: payload.bgColor,
          },
        );

        const activeMTags = await db.get(
          `SELECT value FROM settings WHERE key = $key`,
          {
            $key: 'activeMTags',
          },
        );

        if (activeMTags) {
          const activeMTagsArr =
            activeMTags.value === '' ? [] : activeMTags.value.split(',');
          activeMTagsArr.push(payload.id);

          await db.run(`UPDATE settings SET value = $tagId WHERE key = $key`, {
            $tagId: activeMTagsArr.join(','),
            $key: 'activeMTags',
          });
        } else {
          await db.run(
            `INSERT INTO settings (key, value) VALUES ($key, $value)`,
            {
              $key: 'activeMTags',
              $value: payload.id,
            },
          );
        }
        break;
      }

      case 'delete': {
        const activeMTags = await db.get(
          `SELECT value FROM settings WHERE key = $key`,
          {
            $key: 'activeMTags',
          },
        );

        const activeMTagsArr =
          activeMTags !== '' ? activeMTags.value.split(',') : [];
        const index = activeMTagsArr.findIndex((t: string) => t === payload.id);

        if (index !== -1) {
          activeMTagsArr.splice(index, 1);

          await db.run(
            `UPDATE settings SET value = $activeMTags WHERE key = $key`,
            {
              $activeMTags: activeMTagsArr.join(','),
              $key: 'activeMTags',
            },
          );
        }
        await db.run(`DELETE FROM mtags WHERE id = $id`, {
          $id: payload.id,
        });

        break;
      }

      case 'edit': {
        await db.run(
          `UPDATE mtags SET label = $label, color = $color, bgColor = $bgColor WHERE id = $id`,
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
