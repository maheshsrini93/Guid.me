import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import { config } from "../config";
import * as schema from "./schema";

// Lazy-initialize DB to avoid loading native bindings during Next.js build
let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    const dbPath = path.resolve(config.storagePath, "guid.db");
    mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");

    // Auto-create tables if they don't exist (handles fresh deployments)
    const tableExists = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'"
    ).get();
    if (!tableExists) {
      console.log("[DB] Creating tables...");
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'pending',
          quality_decision TEXT,
          quality_score INTEGER,
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          page_count INTEGER,
          document_name TEXT,
          domain TEXT DEFAULT 'general',
          quality_threshold INTEGER DEFAULT 85,
          generate_illustrations INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          started_at TEXT,
          completed_at TEXT,
          total_cost_usd REAL DEFAULT 0,
          text_revision_count INTEGER DEFAULT 0,
          current_agent TEXT,
          error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS agent_executions (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id),
          agent_name TEXT NOT NULL,
          execution_order INTEGER NOT NULL,
          model TEXT,
          was_escalation INTEGER DEFAULT 0,
          prompt_sent TEXT,
          response_received TEXT,
          structured_output TEXT,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          cost_usd REAL DEFAULT 0,
          prompt_version TEXT,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          duration_ms INTEGER,
          status TEXT NOT NULL DEFAULT 'running',
          error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS generated_guides (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id),
          xml_content TEXT,
          json_content TEXT,
          xml_file_path TEXT,
          quality_score INTEGER,
          quality_decision TEXT,
          quality_issues TEXT,
          safety_issues TEXT,
          step_count INTEGER,
          phase_count INTEGER,
          title TEXT,
          domain TEXT,
          estimated_minutes INTEGER,
          safety_level TEXT,
          models_used TEXT,
          text_revision_loops INTEGER,
          total_cost_usd REAL,
          generated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS generated_illustrations (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id),
          guide_id TEXT NOT NULL REFERENCES generated_guides(id),
          step_number INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          mime_type TEXT NOT NULL DEFAULT 'image/png',
          width INTEGER,
          height INTEGER,
          model TEXT,
          cost_usd REAL,
          duration_ms INTEGER,
          generated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
        CREATE INDEX IF NOT EXISTS idx_agent_exec_job_id ON agent_executions(job_id);
        CREATE INDEX IF NOT EXISTS idx_illustrations_job_id ON generated_illustrations(job_id);
        CREATE INDEX IF NOT EXISTS idx_illustrations_step ON generated_illustrations(job_id, step_number);
      `);
      console.log("[DB] Tables created successfully");
    }

    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
