// SPDX-License-Identifier: MIT
// A D1-shaped wrapper over node:sqlite, so D1Store can be tested without Cloudflare.
// Shaped like D1: prepare(sql).bind(...).all() / first() / run(), bind returns a new statement,
// undefined bind values are refused (D1 refuses them), rows are plain objects, meta.changes is a number.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { D1Like, D1StatementLike } from '../../src/types.ts';

const SCHEMA_URL = new URL('../../schema.sql', import.meta.url);

function statement(db: DatabaseSync, sql: string, values: unknown[]): D1StatementLike {
  return {
    bind(...v: unknown[]) {
      for (const x of v) {
        if (x === undefined) throw new TypeError('D1_TYPE_ERROR: Type undefined is not supported, convert to null');
      }
      return statement(db, sql, v);
    },
    async all<T = Record<string, unknown>>() {
      const rows = db.prepare(sql).all(...(values as never[]));
      return { results: rows.map((r) => ({ ...r })) as T[] };
    },
    async first<T = Record<string, unknown>>() {
      const row = db.prepare(sql).get(...(values as never[]));
      return row ? ({ ...row } as T) : null;
    },
    async run() {
      const info = db.prepare(sql).run(...(values as never[]));
      return { meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
    },
  };
}

export function createD1Shim(): D1Like & { raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(SCHEMA_URL, 'utf8'));
  return {
    raw: db,
    prepare(sql: string) {
      return statement(db, sql, []);
    },
  };
}
