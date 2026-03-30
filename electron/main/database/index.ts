import initSqlJs, { Database } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

let db: Database | null = null
let dbPath: string = ''

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  
  // Ensure userData directory exists
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  
  dbPath = join(userDataPath, 'pingpong.db')
  
  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
  
  // Create tables
  db.run(`
    -- 请求历史表
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT,
      query_params TEXT,
      body TEXT,
      body_type TEXT,
      response_status INTEGER,
      response_time INTEGER,
      response_headers TEXT,
      response_body TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  db.run(`
    -- 环境配置表
    CREATE TABLE IF NOT EXISTS environments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      host TEXT,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  db.run(`
    -- 环境变量表
    CREATE TABLE IF NOT EXISTS variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      environment_id INTEGER,
      key TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
    );
  `)
  
  try {
    db.run('ALTER TABLE environments ADD COLUMN host TEXT')
  } catch {
    // Column already exists, ignore
  }
  
  db.run(`
    -- API分组表
    CREATE TABLE IF NOT EXISTS api_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES api_groups(id) ON DELETE CASCADE
    );
  `)
  
  db.run(`
    -- API表
    CREATE TABLE IF NOT EXISTS apis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      name TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      url TEXT NOT NULL,
      headers TEXT,
      query_params TEXT,
      body TEXT,
      body_type TEXT DEFAULT 'none',
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES api_groups(id) ON DELETE SET NULL
    );
  `)

  // Insert default environment if not exists
  const defaultEnv = db.exec('SELECT id FROM environments WHERE name = "Default"')
  if (defaultEnv.length === 0 || defaultEnv[0].values.length === 0) {
    db.run('INSERT INTO environments (name, is_active) VALUES ("Default", 1)')
  }
  
  // Save database
  saveDatabase()

  console.log('Database initialized at:', dbPath)
}

export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

// Helper function to run query and get results
export function runQuery(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('Database not initialized')
  
  const stmt = db.prepare(sql)
  stmt.bind(params)
  
  const results: any[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row)
  }
  stmt.free()
  
  return results
}

// Helper function to execute a statement
export function execute(sql: string, params: any[] = []): number {
  if (!db) throw new Error('Database not initialized')
  
  db.run(sql, params)
  saveDatabase()
  
  // Get last insert ID
  const result = db.exec('SELECT last_insert_rowid() as id')
  return result[0]?.values[0]?.[0] as number || 0
}
