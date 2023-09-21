import { app } from 'electron';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

export default class SqliteDB {
  // eslint-disable-next-line no-use-before-define
  private static instance: SqliteDB | null;

  private db: Database<sqlite3.Database, sqlite3.Statement> | undefined;

  public static getInstance(): SqliteDB {
    if (!SqliteDB.instance) {
      SqliteDB.instance = new SqliteDB();
    }
    return SqliteDB.instance;
  }

  async getdb() {
    if (!this.db) {
      this.db = await open({
        filename: `${app.getPath('userData')}\\database.db`,
        driver: sqlite3.Database,
      });
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
    }
  }
}
