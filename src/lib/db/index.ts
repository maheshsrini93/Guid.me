import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import { config } from "../config";
import * as schema from "./schema";

// Ensure storage directory exists before opening DB
const dbPath = path.resolve(config.storagePath, "guid.db");
mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
