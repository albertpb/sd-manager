import { app } from 'electron';
import os from 'os';
import log from 'electron-log/main';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { convertPath } from '../renderer/utils';
import { hashFilesInBackground } from './util';

export default class SqliteDB {
  // eslint-disable-next-line no-use-before-define
  private static instance: SqliteDB | null;

  private db: Database<sqlite3.Database, sqlite3.Statement> | undefined;

  // eslint-disable-next-line
  private constructor() {}

  public static getInstance(): SqliteDB {
    if (!SqliteDB.instance) {
      SqliteDB.instance = new SqliteDB();
    }
    return SqliteDB.instance;
  }

  async getdb() {
    if (!this.db) {
      this.db = await open({
        filename: convertPath(
          `${app.getPath('userData')}\\database.db`,
          os.platform(),
        ),
        driver: sqlite3.Database,
      });

      this.db.run(`PRAGMA foreign_keys=ON`);
    }

    return this.db;
  }

  async initdb() {
    const db = await this.getdb();

    const version = await db.get('PRAGMA user_version');

    if (!version.user_version) {
      await db.run('PRAGMA user_version = 1');

      await db.run(`CREATE TABLE IF NOT EXISTS "models" (
        "hash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "path" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "rating" INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY ("hash")
      )`);

      await db.run(`CREATE TABLE IF NOT EXISTS "images" (
        "hash" TEXT NOT NULL,
        "path" TEXT NOT NULL,
        "rating" INTEGER NOT NULL DEFAULT 1,
        "model" TEXT NOT NULL,
        "generatedBy" TEXT NOT NULL,
        "sourcePath" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        PRIMARY KEY ("hash"),
        CONSTRAINT "model_fk" FOREIGN KEY ("model") REFERENCES "models" ("hash") ON DELETE CASCADE ON UPDATE CASCADE
      )`);

      await db.run(`CREATE TABLE IF NOT EXISTS "settings" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        PRIMARY KEY ("key")
      )`);

      version.user_version = 1;
    }

    if (version.user_version === 1) {
      try {
        await db.run(
          `ALTER TABLE images ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT 0`,
        );
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 2`);

      version.user_version = 2;
    }

    if (version.user_version === 2) {
      try {
        await db.run(
          `ALTER TABLE models ADD COLUMN "rating" INTEGER NOT NULL DEFAULT 1`,
        );
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 3`);

      version.user_version = 3;
    }

    if (version.user_version === 3) {
      try {
        await db.run(
          `ALTER TABLE models ADD COLUMN "baseModel" TEXT DEFAULT ''`,
        );
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 4`);

      version.user_version = 4;
    }

    if (version.user_version === 4) {
      try {
        await db.run(`ALTER TABLE models ADD COLUMN modelId INTEGER`);
        await db.run(`ALTER TABLE models ADD COLUMN modelVersionId INTEGER`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 5`);

      version.user_version = 5;
    }

    if (version.user_version === 5) {
      try {
        await db.run(`ALTER TABLE models ADD COLUMN description TEXT`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 6`);

      version.user_version = 6;
    }

    if (version.user_version === 6) {
      try {
        await db.run(`CREATE TABLE IF NOT EXISTS "watch_folders" (
          "path" TEXT NOT NULL
        )`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 7`);

      version.user_version = 7;
    }

    if (version.user_version === 7 || version.user_version === 8) {
      try {
        await db.run(`ALTER TABLE images DROP COLUMN deleted`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 9`);

      version.user_version = 9;
    }

    if (version.user_version === 9) {
      try {
        const images = await db.all(`SELECT sourcePath FROM images`);
        const imageFiles = images.map((img) => img.sourcePath);

        await hashFilesInBackground(imageFiles, undefined, 'blake3');

        const models = await db.all(`SELECT path FROM models`);
        const modelsFiles = models.map((model) => model.path);
        await hashFilesInBackground(modelsFiles, undefined, 'blake3');
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 10`);

      version.user_version = 10;
    }

    if (version.user_version === 10) {
      try {
        // remove images model foreign key
        await db.run(`CREATE TABLE temp_1 (
          "hash" TEXT NOT NULL,
          "path" TEXT NOT NULL,
          "rating" INTEGER NOT NULL DEFAULT 1,
          "model" TEXT NOT NULL,
          "generatedBy" TEXT NOT NULL,
          "sourcePath" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "fileName" TEXT NOT NULL,
          PRIMARY KEY ("hash")
        )`);
        await db.run(
          `INSERT INTO temp_1 (hash, path, rating, model, generatedBy, sourcePath, name, fileName) SELECT hash, path, rating, model, generatedBy, sourcePath, name, fileName FROM images`,
        );
        await db.run(`DROP TABLE images`);
        await db.run(`ALTER TABLE temp_1 RENAME TO images`);

        await db.run(`CREATE TABLE tags (
          id TEXT NOT NULL,
          label TEXT NOT NULL,
          color TEXT NOT NULL,
          bgColor TEXT NOT NULL,
          PRIMARY KEY (id)
        )`);

        await db.run(`CREATE TABLE images_tags (
          tagId TEXT NOT NULL,
          imageHash TEXT NOT NULL,
          PRIMARY KEY (imageHash, tagId),
          FOREIGN KEY (imageHash) REFERENCES images(hash) ON DELETE CASCADE,
          FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
        )`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 11`);

      version.user_version = 11;
    }

    if (version.user_version === 11) {
      try {
        await db.run(`CREATE TABLE mtags (
          id TEXT NOT NULL,
          label TEXT NOT NULL,
          color TEXT NOT NULL,
          bgColor TEXT NOT NULL,
          PRIMARY KEY (id)
        )`);

        await db.run(`CREATE TABLE models_mtags (
          tagId TEXT NOT NULL,
          modelHash TEXT NOT NULL,
          PRIMARY KEY (modelHash, tagId),
          FOREIGN KEY (modelHash) REFERENCES models(hash) ON DELETE CASCADE,
          FOREIGN KEY (tagId) REFERENCES mtags(id) ON DELETE CASCADE
        )`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 12`);

      version.user_version = 12;
    }

    if (version.user_version === 12) {
      try {
        await db.run(`ALTER TABLE models ADD COLUMN modelDescription TEXT`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 13`);

      version.user_version = 13;
    }

    if (version.user_version === 13) {
      try {
        await db.run(`ALTER TABLE models RENAME COLUMN name TO fileName`);
        await db.run(`ALTER TABLE models ADD COLUMN name TEXT`);
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 14`);

      version.user_version = 14;
    }

    if (version.user_version === 14) {
      try {
        await db.run(`ALTER TABLE images ADD COLUMN positivePrompt TEXT`);
        await db.run(`ALTER TABLE images ADD COLUMN negativePrompt TEXT`);
        await db.run(
          `CREATE INDEX idx_positivePrompt ON images(positivePrompt)`,
        );
        await db.run(
          `CREATE INDEX idx_negativePrompt ON images(negativePrompt)`,
        );
      } catch (error) {
        console.log(error);
        log.info(error);
      }

      await db.run(`PRAGMA user_version = 15`);

      version.user_version = 15;
    }
  }
}
