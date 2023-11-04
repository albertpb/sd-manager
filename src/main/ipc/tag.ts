import { IpcMainInvokeEvent } from 'electron';
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

      await db.run(`UPDATE settings SET value = $tagId WHERE key = $key`, {
        $tagId: payload.id,
        $key: 'activeTag',
      });
      break;
    }

    case 'delete': {
      const activeTag = await db.get(
        `SELECT value FROM settings WHERE key = $key`,
        {
          $key: 'activeTag',
        },
      );

      if (activeTag.value === payload.id) {
        const tags = await db.all(`SELECT * FROM tags`);

        await db.run(
          `UPDATE settings SET value = $activeTag WHERE key = $key`,
          {
            $activeTag: tags.length > 0 ? tags[tags.length - 1].id : null,
            $key: 'activeTag',
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
};
