import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const DB_NAME = 'tasks.db';

export function getDatabasePath(): string {
  const userData = app ? app.getPath('userData') : './';
  const dbPath = path.join(userData, DB_NAME);
  console.log('Database path:', dbPath);
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log('Creating database directory:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return dbPath;
}

export function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  console.log('Initializing database at:', dbPath);
  
  try {
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    console.log('Database connection established successfully');
    
    // Read and execute schema
    let schemaPath: string;
    if (app.isPackaged) {
      // In packaged app, schema.sql is in the app's Resources folder
      schemaPath = path.join(app.getAppPath(), '..', 'schema.sql');
    } else {
      // In development
      schemaPath = path.join(__dirname, '../../schema.sql');
    }
    
    console.log('App packaged:', app.isPackaged);
    console.log('App path:', app.getAppPath());
    console.log('Looking for schema at:', schemaPath);
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      executeSchema(db, schema);
      console.log('Database schema initialized successfully');
    } else {
      console.warn('Schema file not found at:', schemaPath);
      
      // Try alternative paths for packaged app
      if (app.isPackaged) {
        const altPaths = [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'schema.sql'),
          path.join(process.resourcesPath, 'app.asar', '..', 'schema.sql'),
          path.join(app.getPath('exe'), '..', '..', 'Resources', 'schema.sql')
        ];
        
        console.log('Trying alternative paths...');
        for (const altPath of altPaths) {
          console.log('Checking:', altPath);
          if (fs.existsSync(altPath)) {
            console.log('Found schema at alternative path:', altPath);
            const schema = fs.readFileSync(altPath, 'utf-8');
            executeSchema(db, schema);
            break;
          }
        }
      }
    }
    
    // Apply migrations
    applyMigrations(db);
    
    return db;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

function executeSchema(db: Database.Database, schema: string): void {
  // Parse schema more carefully to handle multi-line statements like triggers
  const statements = [];
  let currentStatement = '';
  let inTrigger = false;
  
  for (const line of schema.split('\n')) {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('--')) {
      continue;
    }
    
    // Check if we're starting a trigger
    if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true;
    }
    
    currentStatement += ' ' + trimmedLine;
    
    // End of statement
    if (trimmedLine.endsWith(';')) {
      if (inTrigger && trimmedLine.toUpperCase().includes('END;')) {
        // End of trigger
        inTrigger = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else if (!inTrigger) {
        // Regular statement
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
  }
  
  // Execute each statement
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement);
      } catch (err: any) {
        // Ignore errors if table/index already exists
        if (!err.message.includes('already exists')) {
          console.error('Schema execution error:', err.message, 'Statement:', statement);
        }
      }
    }
  }
}

function applyMigrations(db: Database.Database): void {
  try {
    // Check if text_color column exists
    const tableInfo = db.prepare("PRAGMA table_info(tags)").all();
    const hasTextColor = tableInfo.some((col: any) => col.name === 'text_color');
    
    if (!hasTextColor) {
      console.log('Adding text_color column to tags table...');
      db.exec("ALTER TABLE tags ADD COLUMN text_color TEXT DEFAULT '#000000'");
      console.log('text_color column added successfully');
    }

    // Check if routine columns exist in tasks table
    const taskTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const hasIsRoutine = taskTableInfo.some((col: any) => col.name === 'is_routine');
    const hasRoutineType = taskTableInfo.some((col: any) => col.name === 'routine_type');
    const hasLastGeneratedAt = taskTableInfo.some((col: any) => col.name === 'last_generated_at');
    const hasRoutineParentId = taskTableInfo.some((col: any) => col.name === 'routine_parent_id');

    if (!hasIsRoutine) {
      console.log('Adding is_routine column to tasks table...');
      db.exec("ALTER TABLE tasks ADD COLUMN is_routine BOOLEAN DEFAULT 0");
      console.log('is_routine column added successfully');
    }

    if (!hasRoutineType) {
      console.log('Adding routine_type column to tasks table...');
      db.exec("ALTER TABLE tasks ADD COLUMN routine_type TEXT DEFAULT NULL"); // 'daily', 'weekly', 'monthly', etc.
      console.log('routine_type column added successfully');
    }

    if (!hasLastGeneratedAt) {
      console.log('Adding last_generated_at column to tasks table...');
      db.exec("ALTER TABLE tasks ADD COLUMN last_generated_at TIMESTAMP DEFAULT NULL");
      console.log('last_generated_at column added successfully');
    }

    if (!hasRoutineParentId) {
      console.log('Adding routine_parent_id column to tasks table...');
      db.exec("ALTER TABLE tasks ADD COLUMN routine_parent_id INTEGER DEFAULT NULL");
      console.log('routine_parent_id column added successfully');
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
}

export function getDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}