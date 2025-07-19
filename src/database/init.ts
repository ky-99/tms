import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const DB_NAME = 'tasks.db';

export function getDatabasePath(): string {
  const userData = app ? app.getPath('userData') : './';
  const dbPath = path.join(userData, DB_NAME);
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return dbPath;
}

export function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  
  try {
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Read and execute schema
    let schemaPath: string;
    if (app.isPackaged) {
      // In packaged app, schema.sql is in the app's Resources folder
      schemaPath = path.join(app.getAppPath(), '..', 'schema.sql');
    } else {
      // In development
      schemaPath = path.join(__dirname, '../../schema.sql');
    }
    
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      executeSchema(db, schema);
    } else {
      
      // Try alternative paths for packaged app
      if (app.isPackaged) {
        const altPaths = [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'schema.sql'),
          path.join(process.resourcesPath, 'app.asar', '..', 'schema.sql'),
          path.join(app.getPath('exe'), '..', '..', 'Resources', 'schema.sql')
        ];
        
        for (const altPath of altPaths) {
          if (fs.existsSync(altPath)) {
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
      db.exec("ALTER TABLE tags ADD COLUMN text_color TEXT DEFAULT '#000000'");
    }

    // Check if routine columns exist in tasks table
    const taskTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const hasIsRoutine = taskTableInfo.some((col: any) => col.name === 'is_routine');
    const hasRoutineType = taskTableInfo.some((col: any) => col.name === 'routine_type');
    const hasLastGeneratedAt = taskTableInfo.some((col: any) => col.name === 'last_generated_at');
    const hasRoutineParentId = taskTableInfo.some((col: any) => col.name === 'routine_parent_id');

    if (!hasIsRoutine) {
      db.exec("ALTER TABLE tasks ADD COLUMN is_routine BOOLEAN DEFAULT 0");
    }

    if (!hasRoutineType) {
      db.exec("ALTER TABLE tasks ADD COLUMN routine_type TEXT DEFAULT NULL"); // 'daily', 'weekly', 'monthly', etc.
    }

    if (!hasLastGeneratedAt) {
      db.exec("ALTER TABLE tasks ADD COLUMN last_generated_at TIMESTAMP DEFAULT NULL");
    }

    if (!hasRoutineParentId) {
      db.exec("ALTER TABLE tasks ADD COLUMN routine_parent_id INTEGER DEFAULT NULL");
    }

    // Check if new date columns exist
    const hasStartDate = taskTableInfo.some((col: any) => col.name === 'start_date');
    const hasEndDate = taskTableInfo.some((col: any) => col.name === 'end_date');

    console.log('Database migration check: hasStartDate =', hasStartDate, 'hasEndDate =', hasEndDate);

    if (!hasStartDate) {
      console.log('Adding start_date column to tasks table');
      db.exec("ALTER TABLE tasks ADD COLUMN start_date TIMESTAMP DEFAULT NULL");
    }

    if (!hasEndDate) {
      console.log('Adding end_date column to tasks table');
      db.exec("ALTER TABLE tasks ADD COLUMN end_date TIMESTAMP DEFAULT NULL");
    }

    // Add indexes for new date columns if they don't exist
    try {
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date)");
      console.log('Added indexes for new date columns');
    } catch (indexErr) {
      console.log('Index creation skipped or failed:', indexErr);
    }

    // Remove due_date column if it exists (SQLite doesn't support DROP COLUMN directly)
    try {
      const hasDueDate = taskTableInfo.some((col: any) => col.name === 'due_date');
      
      if (hasDueDate) {
        console.log('Migrating due_date data to end_date and removing due_date column');
        
        // Step 1: Copy data from due_date to end_date for tasks that don't have end_date set
        db.exec(`
          UPDATE tasks 
          SET end_date = due_date 
          WHERE due_date IS NOT NULL AND (end_date IS NULL OR end_date = '')
        `);
        
        // Step 2: Get current table structure without due_date
        const currentColumns = taskTableInfo.filter((col: any) => col.name !== 'due_date') as Array<{ name: string; type: string; pk: number; notnull: number; dflt_value: any }>;
        const columnDefs = currentColumns.map((col) => {
          let def = `${col.name} ${col.type}`;
          if (col.pk) def += ' PRIMARY KEY';
          if (col.notnull && !col.pk) def += ' NOT NULL';
          if (col.dflt_value !== null) def += ` DEFAULT ${col.dflt_value}`;
          return def;
        }).join(', ');
        
        // Step 3: Create new table without due_date
        db.exec(`
          BEGIN TRANSACTION;
          
          CREATE TABLE tasks_new (
            ${columnDefs},
            FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
            CHECK (status IN ('pending', 'in_progress', 'completed')),
            CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
          );
          
          INSERT INTO tasks_new SELECT ${currentColumns.map(col => col.name).join(', ')} FROM tasks;
          
          DROP TABLE tasks;
          ALTER TABLE tasks_new RENAME TO tasks;
          
          -- Recreate indexes
          CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
          CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
          CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
          CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
          
          -- Recreate trigger
          CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at
          AFTER UPDATE ON tasks
          BEGIN
              UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END;
          
          COMMIT;
        `);
        
        console.log('Successfully removed due_date column and migrated data to end_date');
      }
    } catch (migrationErr) {
      console.log('Due date migration failed or skipped:', migrationErr);
    }
  } catch (err) {
  }
}

export function getDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}