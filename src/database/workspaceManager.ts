import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { initializeDatabase } from './init';

export interface WorkSpaceMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
  dbPath: string;
  taskCount?: number;
  completedTaskCount?: number;
  tagCount?: number;
}

export interface WorkSpaceStats {
  taskCount: number;
  completedTaskCount: number;
  tagCount: number;
}

const WORKSPACE_DB_NAME = 'workspaces.db';
const DEFAULT_WORKSPACE_ID = 'default';

export class WorkspaceManager {
  private workspaceDb: Database.Database;
  private workspacesDir: string;
  private currentWorkspace: WorkSpaceMetadata | null = null;
  private currentTaskDb: Database.Database | null = null;

  constructor() {
    this.workspacesDir = this.getWorkspacesDirectory();
    this.workspaceDb = this.initializeWorkspaceDatabase();
    this.ensureDefaultWorkspace();
  }

  private getWorkspacesDirectory(): string {
    const userData = app ? app.getPath('userData') : './';
    const workspacesDir = path.join(userData, 'workspaces');
    
    if (!fs.existsSync(workspacesDir)) {
      fs.mkdirSync(workspacesDir, { recursive: true });
    }
    
    return workspacesDir;
  }

  private initializeWorkspaceDatabase(): Database.Database {
    const dbPath = path.join(this.workspacesDir, WORKSPACE_DB_NAME);
    const db = new Database(dbPath);
    
    // Create workspaces table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        last_used TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        db_path TEXT NOT NULL
      )
    `);
    
    return db;
  }

  private ensureDefaultWorkspace(): void {
    const existing = this.workspaceDb
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(DEFAULT_WORKSPACE_ID);
    
    if (!existing) {
      const defaultDbPath = path.join(this.workspacesDir, 'default.db');
      
      // Move existing tasks.db to default workspace if it exists
      this.migrateExistingDatabase(defaultDbPath);
      
      // Create default workspace directly without using createWorkspace to avoid recursion
      const defaultWorkspace = {
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default WorkSpace',
        description: 'The default task management workspace',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isActive: true,
        dbPath: defaultDbPath
      };
      
      // Insert into workspace metadata database
      this.workspaceDb
        .prepare(`
          INSERT INTO workspaces (id, name, description, created_at, last_used, is_active, db_path)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          defaultWorkspace.id,
          defaultWorkspace.name,
          defaultWorkspace.description,
          defaultWorkspace.createdAt,
          defaultWorkspace.lastUsed,
          defaultWorkspace.isActive ? 1 : 0,
          defaultWorkspace.dbPath
        );
      
      // Initialize the task database for this workspace if it doesn't exist
      if (!fs.existsSync(defaultDbPath)) {
        this.initializeTaskDatabase(defaultDbPath);
      }
    }
  }

  private migrateExistingDatabase(targetPath: string): void {
    const userData = app ? app.getPath('userData') : './';
    const oldDbPath = path.join(userData, 'tasks.db');
    
    if (fs.existsSync(oldDbPath) && !fs.existsSync(targetPath)) {
      try {
        fs.copyFileSync(oldDbPath, targetPath);
        console.log('Migrated existing database to default workspace');
      } catch (error) {
        console.error('Failed to migrate existing database:', error);
        // Create new database if migration fails
        this.initializeWorkspaceDatabase();
      }
    }
  }

  public createWorkspace(workspace: Omit<WorkSpaceMetadata, 'dbPath'>): WorkSpaceMetadata {
    const dbPath = path.join(this.workspacesDir, `${workspace.id}.db`);
    
    const workspaceWithPath: WorkSpaceMetadata = {
      ...workspace,
      dbPath
    };
    
    // Insert into workspace metadata database
    this.workspaceDb
      .prepare(`
        INSERT INTO workspaces (id, name, description, created_at, last_used, is_active, db_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        workspaceWithPath.id,
        workspaceWithPath.name,
        workspaceWithPath.description,
        workspaceWithPath.createdAt,
        workspaceWithPath.lastUsed,
        workspaceWithPath.isActive ? 1 : 0,
        workspaceWithPath.dbPath
      );
    
    // Initialize the task database for this workspace
    this.initializeTaskDatabase(dbPath);
    
    return workspaceWithPath;
  }

  private initializeTaskDatabase(dbPath: string): void {
    // Create a new task database using the existing initialization logic
    const tempDb = new Database(dbPath);
    tempDb.pragma('foreign_keys = ON');
    
    // Read and execute schema
    let schemaPath: string;
    if (app.isPackaged) {
      // In packaged app, schema.sql is in the app's Resources folder
      schemaPath = path.join(app.getAppPath(), '..', 'schema.sql');
    } else {
      // In development
      schemaPath = path.join(__dirname, '../../schema.sql');
    }
    
    console.log('Looking for schema at:', schemaPath);
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.executeSchema(tempDb, schema);
      console.log('Schema executed successfully for workspace database');
    } else {
      console.warn('Schema file not found, creating minimal schema');
      // Create minimal schema if schema.sql is not found
      this.createMinimalSchema(tempDb);
    }
    
    tempDb.close();
  }

  private createMinimalSchema(db: Database.Database): void {
    // Create minimal schema for task database - matching schema.sql
    const minimalSchema = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        position INTEGER NOT NULL DEFAULT 0,
        expanded BOOLEAN DEFAULT 1,
        is_routine BOOLEAN DEFAULT 0,
        routine_type TEXT DEFAULT NULL,
        last_generated_at TIMESTAMP DEFAULT NULL,
        routine_parent_id INTEGER DEFAULT NULL,
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (routine_parent_id) REFERENCES tasks(id) ON DELETE SET NULL,
        CHECK (status IN ('pending', 'in_progress', 'completed')),
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
      );

      CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at
      AFTER UPDATE ON tasks
      BEGIN
          UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#808080',
        text_color TEXT DEFAULT '#000000',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_is_routine ON tasks(is_routine);
      CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
    `;

    try {
      db.exec(minimalSchema);
      console.log('Minimal schema created successfully');
    } catch (error) {
      console.error('Error creating minimal schema:', error);
      throw error;
    }
  }

  private executeSchema(db: Database.Database, schema: string): void {
    const statements = [];
    let currentStatement = '';
    let inTrigger = false;
    
    for (const line of schema.split('\n')) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
        inTrigger = true;
      }
      
      currentStatement += ' ' + trimmedLine;
      
      if (trimmedLine.endsWith(';')) {
        if (inTrigger && trimmedLine.toUpperCase().includes('END;')) {
          inTrigger = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        } else if (!inTrigger) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          db.exec(statement);
        } catch (err: any) {
          if (!err.message.includes('already exists')) {
            console.error('Schema execution error:', err.message);
          }
        }
      }
    }
  }

  public getAllWorkspaces(): WorkSpaceMetadata[] {
    return this.workspaceDb
      .prepare('SELECT * FROM workspaces ORDER BY created_at ASC')
      .all()
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastUsed: row.last_used,
        isActive: Boolean(row.is_active),
        dbPath: row.db_path
      }));
  }

  public getWorkspaceById(id: string): WorkSpaceMetadata | null {
    const row: any = this.workspaceDb
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(id);
    
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      createdAt: row.created_at,
      lastUsed: row.last_used,
      isActive: Boolean(row.is_active),
      dbPath: row.db_path
    };
  }

  public getActiveWorkspace(): WorkSpaceMetadata | null {
    const row: any = this.workspaceDb
      .prepare('SELECT * FROM workspaces WHERE is_active = 1')
      .get();
    
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      createdAt: row.created_at,
      lastUsed: row.last_used,
      isActive: true,
      dbPath: row.db_path
    };
  }

  public switchToWorkspace(workspaceId: string): boolean {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      return false;
    }
    
    // Update database: deactivate all workspaces then activate the target
    this.workspaceDb.exec('UPDATE workspaces SET is_active = 0');
    this.workspaceDb
      .prepare('UPDATE workspaces SET is_active = 1 WHERE id = ?')
      .run(workspaceId);
    
    // Close current database connection
    if (this.currentTaskDb) {
      this.currentTaskDb.close();
    }
    
    // Open new database connection
    this.currentTaskDb = new Database(workspace.dbPath);
    this.currentTaskDb.pragma('foreign_keys = ON');
    this.currentWorkspace = workspace;
    
    return true;
  }

  public deleteWorkspace(workspaceId: string): boolean {
    if (workspaceId === DEFAULT_WORKSPACE_ID) {
      throw new Error('Cannot delete the default workspace');
    }
    
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      return false;
    }
    
    if (workspace.isActive) {
      throw new Error('Cannot delete the active workspace');
    }
    
    // Delete from database
    this.workspaceDb
      .prepare('DELETE FROM workspaces WHERE id = ?')
      .run(workspaceId);
    
    // Delete database file
    if (fs.existsSync(workspace.dbPath)) {
      fs.unlinkSync(workspace.dbPath);
    }
    
    return true;
  }

  public getWorkspaceStats(workspaceId: string): WorkSpaceStats | null {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) return null;
    
    // Check if database file exists
    if (!fs.existsSync(workspace.dbPath)) {
      console.warn(`Database file not found for workspace ${workspaceId}: ${workspace.dbPath}`);
      return { taskCount: 0, completedTaskCount: 0, tagCount: 0 };
    }
    
    const db = new Database(workspace.dbPath);
    db.pragma('foreign_keys = ON');
    
    try {
      // Check if tables exist before querying
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = (tables as any[]).map(t => t.name);
      
      const taskCount = tableNames.includes('tasks') 
        ? (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count 
        : 0;
      
      const completedTaskCount = tableNames.includes('tasks') 
        ? (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get() as any).count 
        : 0;
      
      const tagCount = tableNames.includes('tags') 
        ? (db.prepare('SELECT COUNT(*) as count FROM tags').get() as any).count 
        : 0;
      
      return {
        taskCount,
        completedTaskCount,
        tagCount
      };
    } catch (error) {
      console.error('Error getting workspace stats:', error);
      return { taskCount: 0, completedTaskCount: 0, tagCount: 0 };
    } finally {
      db.close();
    }
  }

  public getCurrentTaskDatabase(): Database.Database | null {
    if (!this.currentTaskDb) {
      const activeWorkspace = this.getActiveWorkspace();
      if (activeWorkspace) {
        this.currentTaskDb = new Database(activeWorkspace.dbPath);
        this.currentTaskDb.pragma('foreign_keys = ON');
        this.currentWorkspace = activeWorkspace;
        
        // Apply migrations to existing database
        this.applyDatabaseMigrations(this.currentTaskDb);
      }
    }
    
    return this.currentTaskDb;
  }

  private applyDatabaseMigrations(db: Database.Database): void {
    try {
      // Check if routine columns exist in tasks table
      const taskTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
      const columnNames = (taskTableInfo as any[]).map(col => col.name);
      
      if (!columnNames.includes('is_routine')) {
        console.log('Adding is_routine column to tasks table...');
        db.exec("ALTER TABLE tasks ADD COLUMN is_routine BOOLEAN DEFAULT 0");
        console.log('is_routine column added successfully');
      }

      if (!columnNames.includes('routine_type')) {
        console.log('Adding routine_type column to tasks table...');
        db.exec("ALTER TABLE tasks ADD COLUMN routine_type TEXT DEFAULT NULL");
        console.log('routine_type column added successfully');
      }

      if (!columnNames.includes('last_generated_at')) {
        console.log('Adding last_generated_at column to tasks table...');
        db.exec("ALTER TABLE tasks ADD COLUMN last_generated_at TIMESTAMP DEFAULT NULL");
        console.log('last_generated_at column added successfully');
      }

      if (!columnNames.includes('routine_parent_id')) {
        console.log('Adding routine_parent_id column to tasks table...');
        db.exec("ALTER TABLE tasks ADD COLUMN routine_parent_id INTEGER DEFAULT NULL");
        console.log('routine_parent_id column added successfully');
      }

      // Check if text_color column exists in tags table
      const tagTableInfo = db.prepare("PRAGMA table_info(tags)").all();
      const tagColumnNames = (tagTableInfo as any[]).map(col => col.name);

      if (!tagColumnNames.includes('text_color')) {
        console.log('Adding text_color column to tags table...');
        db.exec("ALTER TABLE tags ADD COLUMN text_color TEXT DEFAULT '#000000'");
        console.log('text_color column added successfully');
      }
    } catch (err) {
      console.error('Migration error:', err);
    }
  }

  public async exportWorkspace(workspaceId: string): Promise<string | null> {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (!fs.existsSync(workspace.dbPath)) {
      throw new Error('Workspace database file not found');
    }

    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'ワークスペースをエクスポート',
      defaultPath: `${workspace.name}.db`,
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    try {
      // Copy the database file to the selected location
      fs.copyFileSync(workspace.dbPath, result.filePath);
      return result.filePath;
    } catch (error) {
      throw new Error(`Failed to export workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async selectFileForImport(): Promise<string | null> {
    try {
      // Alternative approach: Use process.nextTick and a timeout
      const result = await Promise.race([
        this.showDialogWithTimeout(),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Dialog timeout after 10 seconds')), 10000)
        )
      ]);

      if (!result || result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Error in selectFileForImport:', error);
      throw error;
    }
  }

  private async showDialogWithTimeout(): Promise<Electron.OpenDialogReturnValue> {
    return new Promise((resolve, reject) => {
      process.nextTick(async () => {
        try {
          // Try without parent window first
          const dialogResult = await dialog.showOpenDialog({
            title: 'ワークスペースをインポート',
            filters: [
              { name: 'Database Files', extensions: ['db'] },
              { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
          });
          
          resolve(dialogResult);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  public validateImportFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error('Selected file does not exist');
    }

    try {
      // Validate that the file is a valid SQLite database
      const tempDb = new Database(filePath);
      const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      tempDb.close();

      // Check if it looks like a task database (has tasks table)
      const tableNames = (tables as any[]).map(t => t.name);
      if (!tableNames.includes('tasks')) {
        throw new Error('The selected file does not appear to be a valid workspace database');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a database')) {
        throw new Error('The selected file is not a valid SQLite database');
      }
      throw error;
    }
  }

  public async importFromFileData(fileData: Uint8Array, fileName: string): Promise<{ tempPath: string } | null> {
    try {
      // Create temp file
      const tempDir = require('os').tmpdir();
      const tempPath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
      
      // Write file data to temp location
      fs.writeFileSync(tempPath, Buffer.from(fileData));
      
      // Validate the file
      this.validateImportFile(tempPath);
      
      return { tempPath };
    } catch (error) {
      console.error('Error in importFromFileData:', error);
      throw error;
    }
  }

  public async importWorkspace(sourceDbPath: string, name: string, description?: string): Promise<WorkSpaceMetadata> {
    if (!fs.existsSync(sourceDbPath)) {
      throw new Error('Source file does not exist');
    }

    try {
      // Generate unique workspace ID
      const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const targetDbPath = path.join(this.workspacesDir, `${workspaceId}.db`);

      // Copy the database file to workspaces directory
      fs.copyFileSync(sourceDbPath, targetDbPath);

      // Create workspace metadata
      const workspace: WorkSpaceMetadata = {
        id: workspaceId,
        name: name,
        description: description || '',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isActive: false,
        dbPath: targetDbPath
      };

      // Insert into workspace metadata database
      this.workspaceDb
        .prepare(`
          INSERT INTO workspaces (id, name, description, created_at, last_used, is_active, db_path)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          workspace.id,
          workspace.name,
          workspace.description,
          workspace.createdAt,
          workspace.lastUsed,
          workspace.isActive ? 1 : 0,
          workspace.dbPath
        );

      // Apply any necessary migrations to the imported database
      const importedDb = new Database(targetDbPath);
      importedDb.pragma('foreign_keys = ON');
      this.applyDatabaseMigrations(importedDb);
      importedDb.close();

      // Clean up temp file if it exists
      if (sourceDbPath.includes('temp_')) {
        try {
          fs.unlinkSync(sourceDbPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError);
        }
      }

      return workspace;
    } catch (error) {
      throw new Error(`Failed to import workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public close(): void {
    if (this.currentTaskDb) {
      this.currentTaskDb.close();
    }
    if (this.workspaceDb) {
      this.workspaceDb.close();
    }
  }
}

// Singleton instance
let workspaceManager: WorkspaceManager | null = null;

export function getWorkspaceManager(): WorkspaceManager {
  if (!workspaceManager) {
    workspaceManager = new WorkspaceManager();
  }
  return workspaceManager;
}

export function closeWorkspaceManager(): void {
  if (workspaceManager) {
    workspaceManager.close();
    workspaceManager = null;
  }
}