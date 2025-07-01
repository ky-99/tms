import Database from 'better-sqlite3';
import { getDatabase } from './init';
import { Task, CreateTaskInput, UpdateTaskInput, Tag, Attachment, Comment } from '../types/task';

export class TaskRepository {
  private db: Database.Database;

  constructor() {
    try {
      this.db = getDatabase();
      console.log('TaskRepository: Database connection established');
    } catch (error) {
      console.error('TaskRepository: Failed to get database connection:', error);
      throw error;
    }
  }

  // タスクをツリー構造で取得
  getAllTasksAsTree(): Task[] {
    const tasks = this.db.prepare(`
      SELECT id, parent_id as parentId, title, description, status, priority,
             due_date as dueDate, created_at as createdAt, updated_at as updatedAt,
             completed_at as completedAt, position, expanded,
             is_routine as isRoutine, routine_type as routineType,
             last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
      FROM tasks
      ORDER BY parent_id, position
    `).all() as Task[];

    // 各タスクにタグ情報を追加
    const tasksWithTags = tasks.map(task => ({
      ...task,
      tags: this.getTagsByTaskId(task.id)
    }));

    return this.buildTree(tasksWithTags);
  }

  // 特定のタスクとその子タスクを取得
  getTaskWithChildren(taskId: number): Task | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.children = this.getChildrenByParentId(taskId);
    task.tags = this.getTagsByTaskId(taskId);
    task.attachments = this.getAttachmentsByTaskId(taskId);
    task.comments = this.getCommentsByTaskId(taskId);

    return task;
  }

  // IDでタスクを取得
  getTaskById(id: number): Task | null {
    const task = this.db.prepare(`
      SELECT id, parent_id as parentId, title, description, status, priority,
             due_date as dueDate, created_at as createdAt, updated_at as updatedAt,
             completed_at as completedAt, position, expanded,
             is_routine as isRoutine, routine_type as routineType,
             last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
      FROM tasks WHERE id = ?
    `).get(id) as Task | undefined;

    return task || null;
  }

  // 親IDで子タスクを取得
  getChildrenByParentId(parentId: number): Task[] {
    const children = this.db.prepare(`
      SELECT id, parent_id as parentId, title, description, status, priority,
             due_date as dueDate, created_at as createdAt, updated_at as updatedAt,
             completed_at as completedAt, position, expanded,
             is_routine as isRoutine, routine_type as routineType,
             last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
      FROM tasks WHERE parent_id = ?
      ORDER BY position
    `).all(parentId) as Task[];

    // 再帰的に子タスクを取得
    return children.map(child => ({
      ...child,
      children: this.getChildrenByParentId(child.id)
    }));
  }

  // タスクを作成
  createTask(input: CreateTaskInput): Task {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (parent_id, title, description, status, priority, due_date, position, expanded, 
                        is_routine, routine_type, routine_parent_id)
      VALUES (@parentId, @title, @description, @status, @priority, @dueDate, @position, @expanded,
              @isRoutine, @routineType, @routineParentId)
    `);

    const params = {
      parentId: input.parentId !== undefined ? input.parentId : null,
      title: input.title,
      description: input.description || null,
      status: input.status || 'pending',
      priority: input.priority || 'medium',
      dueDate: input.dueDate || null,
      position: input.position !== undefined ? input.position : 0,
      expanded: input.expanded !== undefined ? (input.expanded ? 1 : 0) : 0,
      isRoutine: input.isRoutine ? 1 : 0,
      routineType: input.routineType || null,
      routineParentId: input.routineParentId || null
    };

    const result = stmt.run(params);
    return this.getTaskById(result.lastInsertRowid as number)!;
  }

  // タスクを更新
  updateTask(id: number, input: UpdateTaskInput): Task | null {
    const updates: string[] = [];
    const params: any = { id };

    if (input.title !== undefined) {
      updates.push('title = @title');
      params.title = input.title;
    }
    if (input.description !== undefined) {
      updates.push('description = @description');
      params.description = input.description;
    }
    if (input.status !== undefined) {
      updates.push('status = @status');
      params.status = input.status;
      if (input.status === 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    if (input.priority !== undefined) {
      updates.push('priority = @priority');
      params.priority = input.priority;
    }
    if (input.dueDate !== undefined) {
      updates.push('due_date = @dueDate');
      params.dueDate = input.dueDate;
    }
    if (input.parentId !== undefined) {
      updates.push('parent_id = @parentId');
      params.parentId = input.parentId;
    }
    if (input.position !== undefined) {
      updates.push('position = @position');
      params.position = input.position;
    }
    if (input.expanded !== undefined) {
      updates.push('expanded = @expanded');
      params.expanded = input.expanded ? 1 : 0;
    }
    if (input.isRoutine !== undefined) {
      updates.push('is_routine = @isRoutine');
      params.isRoutine = input.isRoutine ? 1 : 0;
    }
    if (input.routineType !== undefined) {
      updates.push('routine_type = @routineType');
      params.routineType = input.routineType;
    }

    if (updates.length === 0) return this.getTaskById(id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = @id
    `);

    stmt.run(params);

    // ステータスが更新された場合、親タスクの自動完了/未完了をチェック
    if (input.status !== undefined) {
      if (input.status === 'completed') {
        this.checkAndUpdateParentCompletion(id);
      } else {
        this.checkAndUpdateParentIncomplete(id);
      }
    }

    return this.getTaskById(id);
  }

  // 親タスクの自動完了をチェックして更新
  private checkAndUpdateParentCompletion(taskId: number): void {
    const task = this.getTaskById(taskId);
    if (!task || !task.parentId) return;

    // 親タスクの全ての子タスクを取得
    const siblings = this.db.prepare(`
      SELECT status FROM tasks WHERE parent_id = ?
    `).all(task.parentId) as { status: string }[];

    // 全ての子タスクが完了しているかチェック
    const allCompleted = siblings.every(sibling => sibling.status === 'completed');

    if (allCompleted) {
      // 親タスクを完了に更新
      const parentUpdateStmt = this.db.prepare(`
        UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      parentUpdateStmt.run(task.parentId);

      // 再帰的に祖父タスクもチェック
      this.checkAndUpdateParentCompletion(task.parentId);
    }
  }

  // 親タスクの自動未完了をチェックして更新
  private checkAndUpdateParentIncomplete(taskId: number): void {
    const task = this.getTaskById(taskId);
    if (!task || !task.parentId) return;

    // 親タスクが完了状態の場合のみ処理
    const parent = this.getTaskById(task.parentId);
    if (!parent || parent.status !== 'completed') return;

    // 親タスクを進行中に戻す
    const parentUpdateStmt = this.db.prepare(`
      UPDATE tasks SET status = 'in_progress', completed_at = NULL WHERE id = ?
    `);
    parentUpdateStmt.run(task.parentId);

    // 再帰的に祖父タスクもチェック
    this.checkAndUpdateParentIncomplete(task.parentId);
  }

  // タスクを削除（子タスクも自動的に削除される）
  deleteTask(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // タグを作成（既存の場合は取得）
  createTag(name: string, color: string = '#808080', textColor: string = '#000000'): Tag {
    // まず既存のタグを検索
    const existingTag = this.db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag | undefined;
    
    if (existingTag) {
      return existingTag;
    }
    
    // 存在しない場合は新規作成
    const stmt = this.db.prepare('INSERT INTO tags (name, color, text_color) VALUES (?, ?, ?)');
    const result = stmt.run(name, color, textColor);
    
    return this.db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  }

  // タスクにタグを追加
  addTagToTask(taskId: number, tagId: number): void {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
    stmt.run(taskId, tagId);
  }

  // タスクからタグを削除
  removeTagFromTask(taskId: number, tagId: number): void {
    const stmt = this.db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?');
    stmt.run(taskId, tagId);
  }

  // タスクのタグを取得
  getTagsByTaskId(taskId: number): Tag[] {
    return this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN task_tags tt ON t.id = tt.tag_id
      WHERE tt.task_id = ?
    `).all(taskId) as Tag[];
  }

  // 全タグを取得
  getAllTags(): Tag[] {
    return this.db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  }

  // タグを更新
  updateTag(id: number, name: string, color: string, textColor: string): Tag | null {
    const stmt = this.db.prepare('UPDATE tags SET name = ?, color = ?, text_color = ? WHERE id = ?');
    const result = stmt.run(name, color, textColor, id);
    
    if (result.changes > 0) {
      return this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
    }
    return null;
  }

  // タグを削除
  deleteTag(id: number): boolean {
    // まず関連するタスクタグを削除
    this.db.prepare('DELETE FROM task_tags WHERE tag_id = ?').run(id);
    // タグ自体を削除
    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 添付ファイルを追加
  addAttachment(taskId: number, fileName: string, filePath: string, fileSize?: number, mimeType?: string): Attachment {
    const stmt = this.db.prepare(`
      INSERT INTO attachments (task_id, file_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(taskId, fileName, filePath, fileSize || null, mimeType || null);
    
    return this.db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid) as Attachment;
  }

  // タスクの添付ファイルを取得
  getAttachmentsByTaskId(taskId: number): Attachment[] {
    return this.db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(taskId) as Attachment[];
  }

  // コメントを追加
  addComment(taskId: number, content: string): Comment {
    const stmt = this.db.prepare('INSERT INTO comments (task_id, content) VALUES (?, ?)');
    const result = stmt.run(taskId, content);
    
    return this.db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid) as Comment;
  }

  // タスクのコメントを取得
  getCommentsByTaskId(taskId: number): Comment[] {
    return this.db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as Comment[];
  }

  // ツリー構造を構築するヘルパー関数（最適化版）
  private buildTree(tasks: Task[]): Task[] {
    if (tasks.length === 0) return [];

    const taskMap = new Map<number, Task>();
    const rootTasks: Task[] = [];

    // パフォーマンス改善: 一回のループで処理
    for (const task of tasks) {
      const taskWithChildren = { ...task, children: [] };
      taskMap.set(task.id, taskWithChildren);
      
      if (task.parentId === null) {
        rootTasks.push(taskWithChildren);
      }
    }

    // 親子関係の構築（rootタスク以外のみ処理）
    for (const task of tasks) {
      if (task.parentId !== null) {
        const parent = taskMap.get(task.parentId);
        const child = taskMap.get(task.id);
        if (parent && child) {
          parent.children!.push(child);
        }
      }
    }

    return rootTasks;
  }

  // 全てのルーティンタスクを取得
  getRoutineTasks(): Task[] {
    return this.db.prepare(`
      SELECT id, parent_id as parentId, title, description, status, priority,
             due_date as dueDate, created_at as createdAt, updated_at as updatedAt,
             completed_at as completedAt, position, expanded,
             is_routine as isRoutine, routine_type as routineType,
             last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
      FROM tasks 
      WHERE is_routine = 1
      ORDER BY position
    `).all() as Task[];
  }

  // データベースを閉じる
  close(): void {
    this.db.close();
  }
}