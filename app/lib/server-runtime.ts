import "server-only";

import Database from "better-sqlite3";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { installRuntimeEnv, type D1DatabaseLike, type D1StatementLike, type R2BucketLike } from "./runtime-env";

type SqlValue = string | number | bigint | null | Uint8Array;

class LocalStatement implements D1StatementLike {
  private values: SqlValue[] = [];
  constructor(private database: Database.Database, private query: string) {}

  bind(...values: unknown[]) {
    const statement = new LocalStatement(this.database, this.query);
    statement.values = values.map((value) => value === undefined ? null : value) as SqlValue[];
    return statement;
  }

  async first<T = Record<string, unknown>>() {
    return (this.database.prepare(this.query).get(...this.values) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    return { results: this.database.prepare(this.query).all(...this.values) as T[] };
  }

  async run() { return this.runSync(); }

  runSync() {
    const result = this.database.prepare(this.query).run(...this.values);
    return { meta: { changes: result.changes } };
  }
}

class LocalDatabase implements D1DatabaseLike {
  constructor(private database: Database.Database) {}
  prepare(query: string) { return new LocalStatement(this.database, query); }
  async batch(statements: D1StatementLike[]) {
    const execute = this.database.transaction(() => statements.map((statement) => (statement as LocalStatement).runSync()));
    return execute();
  }
}

class LocalBucket implements R2BucketLike {
  constructor(private directory: string) { mkdirSync(directory, { recursive: true }); }
  private filePath(key: string) { return path.join(this.directory, key); }
  private metaPath(key: string) { return `${this.filePath(key)}.meta.json`; }

  async put(key: string, value: ReadableStream | ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string; contentDisposition?: string } }) {
    const destination = this.filePath(key);
    await mkdir(path.dirname(destination), { recursive: true });
    if (value instanceof ArrayBuffer) {
      await writeFile(destination, Buffer.from(new Uint8Array(value)));
    } else if (value instanceof Uint8Array) {
      await writeFile(destination, Buffer.from(value));
    } else {
      const output = createWriteStream(destination);
      Readable.fromWeb(value as never).pipe(output);
      await finished(output);
    }
    await writeFile(this.metaPath(key), JSON.stringify(options?.httpMetadata ?? {}));
  }

  async get(key: string) {
    const source = this.filePath(key);
    if (!existsSync(source)) return null;
    const metadata = existsSync(this.metaPath(key)) ? JSON.parse(await readFile(this.metaPath(key), "utf8")) : {};
    const details = await stat(source);
    return {
      body: Readable.toWeb(createReadStream(source)) as ReadableStream<Uint8Array>,
      size: details.size,
      httpEtag: metadata.etag,
    };
  }

  async delete(key: string) {
    await Promise.all([rm(this.filePath(key), { force: true }), rm(this.metaPath(key), { force: true })]);
  }
}

const localGlobal = globalThis as typeof globalThis & { __FGDLL_LOCAL_RUNTIME_READY__?: boolean };

function migrate(database: Database.Database) {
  database.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _fgdll_migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL);");
  for (const filename of ["0000_yummy_beast.sql", "0001_elite_fixer.sql", "0002_graceful_omega_flight.sql", "0003_needy_stature.sql", "0004_purple_rage.sql"]) {
    if (database.prepare("SELECT 1 FROM _fgdll_migrations WHERE name = ?").get(filename)) continue;
    const source = readFileSync(path.join(process.cwd(), "drizzle", filename), "utf8");
    database.transaction(() => {
      for (const statement of source.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) database.exec(statement);
      database.prepare("INSERT INTO _fgdll_migrations (name) VALUES (?)").run(filename);
    })();
  }
  const groupColumns = database.prepare("PRAGMA table_info(directory_groups)").all() as Array<{ name: string }>;
  if (!groupColumns.some((column) => column.name === "session_types")) {
    database.exec("ALTER TABLE directory_groups ADD session_types text DEFAULT '' NOT NULL");
  }
}

if (!localGlobal.__FGDLL_LOCAL_RUNTIME_READY__) {
  const dataDirectory = process.env.FGDLL_DATA_DIR || path.join(process.cwd(), "data");
  mkdirSync(dataDirectory, { recursive: true });
  const database = new Database(path.join(dataDirectory, "portal.sqlite"));
  migrate(database);
  installRuntimeEnv({
    DB: new LocalDatabase(database),
    BUCKET: new LocalBucket(path.join(dataDirectory, "uploads")),
    FGDLL_ADMIN_EMAILS: process.env.FGDLL_ADMIN_EMAILS,
    FGDLL_LEADER_EMAILS: process.env.FGDLL_LEADER_EMAILS,
    FGDLL_NOTIFICATION_EMAIL: process.env.FGDLL_NOTIFICATION_EMAIL,
  });
  localGlobal.__FGDLL_LOCAL_RUNTIME_READY__ = true;
}
