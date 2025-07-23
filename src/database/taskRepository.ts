import Database from 'better-sqlite3';
// Removed unused import: getDatabase
import { Task, CreateTaskInput, UpdateTaskInput, Tag, Attachment, Comment } from '../types/task';
import { WorkspaceManager } from './workspaceManager';

export class TaskRepository {
  private workspaceManager: WorkspaceManager;

  constructor(workspaceManager: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
    this.fixPositionValues(true); // 強制的にマイグレーションを実行
  }

  private getDb(): Database.Database {
    const db = this.workspaceManager.getCurrentTaskDatabase();
    if (!db) {
      throw new Error('No active workspace database');
    }
    return db;
  }

  // 既存データのposition値を修正するマイグレーション関数
  public fixPositionValues(force: boolean = false): void {
    try {
      const db = this.getDb();
      
      if (!force) {
        // 既にposition値が設定されているかチェック
        // 少なくとも1つのタスクが0以外のposition値を持っているかチェック
        const totalTasks = db.prepare(`SELECT COUNT(*) as count FROM tasks`).get() as { count: number };
        const tasksWithZeroPosition = db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE position = 0
        `).get() as { count: number };
        
        // すべてのタスクのpositionが0の場合、マイグレーションが必要
        const needsMigration = totalTasks.count > 0 && tasksWithZeroPosition.count === totalTasks.count;
        
        if (!needsMigration) {
          return;
        }
      }
      
      
      // 全てのタスクを取得し、親ごとにグループ化
      const allTasks = db.prepare(`
        SELECT id, parent_id, created_at 
        FROM tasks 
        ORDER BY parent_id, created_at
      `).all() as { id: number, parent_id: number | null, created_at: string }[];
      
      // 親IDごとにタスクをグループ化
      const tasksByParent = new Map<number | null, { id: number, created_at: string }[]>();
      
      for (const task of allTasks) {
        const parentId = task.parent_id;
        if (!tasksByParent.has(parentId)) {
          tasksByParent.set(parentId, []);
        }
        tasksByParent.get(parentId)!.push({ id: task.id, created_at: task.created_at });
      }
      
      // 各親グループでposition値を設定
      const updateStmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
      
      for (const [_parentId, tasks] of tasksByParent) {
        // 作成日時順にソート
        tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // position値を設定
        tasks.forEach((task, index) => {
          updateStmt.run(index, task.id);
        });
        
      }
      
      
    } catch (error) {
    }
  }

  // タスクをツリー構造で取得
  getAllTasksAsTree(): Task[] {
    const db = this.getDb();
    
    // Check if routine columns and new date columns exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = (tableInfo as any[]).map(col => col.name);
    const hasRoutineColumns = columnNames.includes('is_routine');
    const hasNewDateColumns = columnNames.includes('start_date') && columnNames.includes('end_date');
    const hasTimeColumns = columnNames.includes('start_time') && columnNames.includes('end_time');
    
    let query;
    if (hasRoutineColumns && hasNewDateColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, start_time as startTime,
               end_date as endDate, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks
        ORDER BY COALESCE(parent_id, -1), position, id
      `;
    } else if (hasRoutineColumns && hasNewDateColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               NULL as startTime, NULL as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks
        ORDER BY COALESCE(parent_id, -1), position, id
      `;
    } else if (hasRoutineColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId,
               NULL as startDate, NULL as endDate
        FROM tasks
        ORDER BY COALESCE(parent_id, -1), position, id
      `;
    } else if (hasNewDateColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId
        FROM tasks
        ORDER BY COALESCE(parent_id, -1), position, id
      `;
    } else {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId,
               NULL as startDate, NULL as endDate
        FROM tasks
        ORDER BY COALESCE(parent_id, -1), position, id
      `;
    }
    
    const tasks = db.prepare(query).all() as Task[];

    // 各タスクにタグ情報を追加し、NULLを空文字列に正規化
    const tasksWithTags = tasks.map(task => {
      const tags = this.getTagsByTaskId(task.id);
      return {
        ...task,
        description: task.description || '',
        tags: tags,
        tagIds: tags.map(tag => tag.id)
      };
    });

    const treeStructure = this.buildTree(tasksWithTags);
    
    return treeStructure;
  }

  // 特定のタスクとその子タスクを取得
  getTaskWithChildren(taskId: number): Task | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.children = this.getChildrenByParentId(taskId);
    const tags = this.getTagsByTaskId(taskId);
    task.tags = tags;
    task.tagIds = tags.map(tag => tag.id);
    task.attachments = this.getAttachmentsByTaskId(taskId);
    task.comments = this.getCommentsByTaskId(taskId);

    return task;
  }

  // IDでタスクを取得
  getTaskById(id: number): Task | null {
    const db = this.getDb();
    
    // Check if routine columns and new date columns exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = (tableInfo as any[]).map(col => col.name);
    const hasRoutineColumns = columnNames.includes('is_routine');
    const hasNewDateColumns = columnNames.includes('start_date') && columnNames.includes('end_date');
    const hasTimeColumns = columnNames.includes('start_time') && columnNames.includes('end_time');
    
    let query;
    if (hasRoutineColumns && hasNewDateColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               start_time as startTime, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks WHERE id = ?
      `;
    } else if (hasRoutineColumns && hasNewDateColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               NULL as startTime, NULL as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks WHERE id = ?
      `;
    } else if (hasRoutineColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               NULL as startDate, NULL as endDate,
               start_time as startTime, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks WHERE id = ?
      `;
    } else if (hasRoutineColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId,
               NULL as startDate, NULL as endDate, NULL as startTime, NULL as endTime
        FROM tasks WHERE id = ?
      `;
    } else if (hasNewDateColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               start_time as startTime, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId
        FROM tasks WHERE id = ?
      `;
    } else if (hasNewDateColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               NULL as startTime, NULL as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId
        FROM tasks WHERE id = ?
      `;
    } else {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId,
               NULL as startDate, NULL as endDate, NULL as startTime, NULL as endTime
        FROM tasks WHERE id = ?
      `;
    }
    
    const task = db.prepare(query).get(id) as Task | undefined;

    // データベースのNULLを空文字列に正規化、タグ情報を追加
    if (task) {
      task.description = task.description || '';
      const tags = this.getTagsByTaskId(task.id);
      task.tags = tags;
      task.tagIds = tags.map(tag => tag.id);
    }

    return task || null;
  }

  // 親IDで子タスクを取得
  getChildrenByParentId(parentId: number): Task[] {
    const db = this.getDb();
    
    // Check if routine columns and date/time columns exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = (tableInfo as any[]).map(col => col.name);
    const hasRoutineColumns = columnNames.includes('is_routine');
    const hasNewDateColumns = columnNames.includes('start_date') && columnNames.includes('end_date');
    const hasTimeColumns = columnNames.includes('start_time') && columnNames.includes('end_time');
    
    let query;
    if (hasRoutineColumns && hasNewDateColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               start_time as startTime, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    } else if (hasRoutineColumns && hasNewDateColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               NULL as startTime, NULL as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    } else if (hasRoutineColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               NULL as startDate, NULL as endDate,
               start_time as startTime, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    } else if (hasRoutineColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId,
               NULL as startDate, NULL as endDate, NULL as startTime, NULL as endTime
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    } else if (hasNewDateColumns && hasTimeColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               start_time as startTime, end_time as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    } else if (hasNewDateColumns) {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               start_date as startDate, end_date as endDate,
               NULL as startTime, NULL as endTime,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    } else {
      query = `
        SELECT id, parent_id as parentId, title, description, status, priority,
               created_at as createdAt, updated_at as updatedAt,
               completed_at as completedAt, position, expanded,
               0 as isRoutine, NULL as routineType,
               NULL as lastGeneratedAt, NULL as routineParentId,
               NULL as startDate, NULL as endDate, NULL as startTime, NULL as endTime
        FROM tasks WHERE parent_id = ?
        ORDER BY position, id
      `;
    }
    
    const children = db.prepare(query).all(parentId) as Task[];

    // 再帰的に子タスクを取得し、NULLを空文字列に正規化、タグ情報を追加
    return children.map(child => {
      const tags = this.getTagsByTaskId(child.id);
      return {
        ...child,
        description: child.description || '',
        tags: tags,
        tagIds: tags.map(tag => tag.id),
        children: this.getChildrenByParentId(child.id)
      };
    });
  }

  // タスクを作成
  createTask(input: CreateTaskInput): Task {
    const db = this.getDb();
    
    // Check if routine columns and new date columns exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = (tableInfo as any[]).map(col => col.name);
    const hasRoutineColumns = columnNames.includes('is_routine');
    const hasNewDateColumns = columnNames.includes('start_date') && columnNames.includes('end_date');
    const hasTimeColumns = columnNames.includes('start_time') && columnNames.includes('end_time');
    
    let stmt;
    if (hasRoutineColumns && hasNewDateColumns && hasTimeColumns) {
      stmt = db.prepare(`
        INSERT INTO tasks (parent_id, title, description, status, priority, start_date, start_time, end_date, end_time, position, expanded, 
                          is_routine, routine_type, routine_parent_id)
        VALUES (@parentId, @title, @description, @status, @priority, @startDate, @startTime, @endDate, @endTime, @position, @expanded,
                @isRoutine, @routineType, @routineParentId)
      `);
    } else if (hasRoutineColumns && hasNewDateColumns) {
      stmt = db.prepare(`
        INSERT INTO tasks (parent_id, title, description, status, priority, start_date, end_date, position, expanded, 
                          is_routine, routine_type, routine_parent_id)
        VALUES (@parentId, @title, @description, @status, @priority, @startDate, @endDate, @position, @expanded,
                @isRoutine, @routineType, @routineParentId)
      `);
    } else if (hasRoutineColumns) {
      stmt = db.prepare(`
        INSERT INTO tasks (parent_id, title, description, status, priority, position, expanded, 
                          is_routine, routine_type, routine_parent_id)
        VALUES (@parentId, @title, @description, @status, @priority, @position, @expanded,
                @isRoutine, @routineType, @routineParentId)
      `);
    } else if (hasNewDateColumns && hasTimeColumns) {
      stmt = db.prepare(`
        INSERT INTO tasks (parent_id, title, description, status, priority, start_date, start_time, end_date, end_time, position, expanded)
        VALUES (@parentId, @title, @description, @status, @priority, @startDate, @startTime, @endDate, @endTime, @position, @expanded)
      `);
    } else if (hasNewDateColumns) {
      stmt = db.prepare(`
        INSERT INTO tasks (parent_id, title, description, status, priority, start_date, end_date, position, expanded)
        VALUES (@parentId, @title, @description, @status, @priority, @startDate, @endDate, @position, @expanded)
      `);
    } else {
      stmt = db.prepare(`
        INSERT INTO tasks (parent_id, title, description, status, priority, position, expanded)
        VALUES (@parentId, @title, @description, @status, @priority, @position, @expanded)
      `);
    }

    // もしpositionが指定されていない場合は、同じ親を持つタスクの最大位置+1を使用
    let position = input.position;
    if (position === undefined) {
      let maxPositionResult: { maxPosition: number | null };
      
      if (input.parentId === null || input.parentId === undefined) {
        // 親がNULLの場合
        maxPositionResult = db.prepare(`
          SELECT MAX(position) as maxPosition 
          FROM tasks 
          WHERE parent_id IS NULL
        `).get() as { maxPosition: number | null };
      } else {
        // 親がある場合
        maxPositionResult = db.prepare(`
          SELECT MAX(position) as maxPosition 
          FROM tasks 
          WHERE parent_id = ?
        `).get(input.parentId) as { maxPosition: number | null };
      }
      
      position = (maxPositionResult.maxPosition || -1) + 1;
    }

    let params: any = {
      parentId: input.parentId !== undefined ? input.parentId : null,
      title: input.title,
      description: input.description === '' ? null : (input.description || null),
      status: input.status || 'pending',
      priority: input.priority || 'medium',
      position: position,
      expanded: input.expanded !== undefined ? (input.expanded ? 1 : 0) : 0
    };

    if (hasNewDateColumns) {
      params.startDate = input.startDate || null;
      params.endDate = input.endDate || null;
    }
    
    if (hasTimeColumns) {
      params.startTime = input.startTime || null;
      params.endTime = input.endTime || null;
    }
    
    if (hasRoutineColumns) {
      params.isRoutine = input.isRoutine ? 1 : 0;
      params.routineType = input.routineType || null;
      params.routineParentId = input.routineParentId || null;
    }

    const result = stmt.run(params);
    const newTaskId = result.lastInsertRowid as number;
    
    // タグの関連付け
    if (input.tagIds && input.tagIds.length > 0) {
      for (const tagId of input.tagIds) {
        this.addTagToTask(newTaskId, tagId);
      }
    }
    
    // 新しいタスクが作成されたら、親タスクのステータスを自動更新
    if (input.parentId) {
      this.updateParentTaskStatuses(newTaskId);
    }
    
    return this.getTaskWithChildren(newTaskId)!;
  }

  // 特定のタスクの後に新しいタスクを挿入
  createTaskAfter(input: CreateTaskInput, afterTaskId: number): Task {
    const afterTask = this.getTaskById(afterTaskId);
    if (!afterTask) {
      throw new Error('Reference task not found');
    }


    // 同じ親を持つタスクを確認
    const db = this.getDb();
    let siblingTasksQuery: any;
    let siblingParams: any[];
    
    if (afterTask.parentId === null) {
      siblingTasksQuery = db.prepare(`
        SELECT id, title, position 
        FROM tasks 
        WHERE parent_id IS NULL 
        ORDER BY position
      `);
      siblingParams = [];
    } else {
      siblingTasksQuery = db.prepare(`
        SELECT id, title, position 
        FROM tasks 
        WHERE parent_id = ? 
        ORDER BY position
      `);
      siblingParams = [afterTask.parentId];
    }

    const _siblingTasks = siblingTasksQuery.all(...siblingParams);

    // 同じ親を持つタスクの中で、参照タスクより後にあるタスクの位置を+1する
    // まず、すべてのタスクのpositionが0かどうかチェック
    let siblingTasksWithNonZeroPosition: any[];
    
    if (afterTask.parentId === null) {
      siblingTasksWithNonZeroPosition = db.prepare(`
        SELECT id FROM tasks 
        WHERE parent_id IS NULL AND position > 0
      `).all();
    } else {
      siblingTasksWithNonZeroPosition = db.prepare(`
        SELECT id FROM tasks 
        WHERE parent_id = ? AND position > 0
      `).all(afterTask.parentId);
    }
    
    // すべてのタスクのpositionが0の場合、先にマイグレーションを実行
    if (siblingTasksWithNonZeroPosition.length === 0) {
      this.fixPositionValues(true); // 強制実行
      
      // マイグレーション後、参照タスクを再取得
      const updatedAfterTask = this.getTaskById(afterTaskId);
      if (!updatedAfterTask) {
        throw new Error('Reference task not found after migration');
      }
      afterTask.position = updatedAfterTask.position;
    }
    
    let updatePositionsStmt: any;
    let updateParams: any[];
    
    if (afterTask.parentId === null) {
      // 親がNULLの場合
      updatePositionsStmt = db.prepare(`
        UPDATE tasks 
        SET position = position + 1 
        WHERE parent_id IS NULL AND position > ?
      `);
      updateParams = [afterTask.position];
    } else {
      // 親がある場合
      updatePositionsStmt = db.prepare(`
        UPDATE tasks 
        SET position = position + 1 
        WHERE parent_id = ? AND position > ?
      `);
      updateParams = [afterTask.parentId, afterTask.position];
    }

    const updateResult = updatePositionsStmt.run(...updateParams);

    // 新しいタスクを参照タスクの次の位置に挿入
    const newTaskInput = {
      ...input,
      parentId: afterTask.parentId,
      position: afterTask.position + 1
    };

    const newTask = this.createTask(newTaskInput);
    
    return newTask;
  }

  // タスクを更新
  updateTask(id: number, input: UpdateTaskInput): Task | null {
    // 親タスク変更時のステータス更新のため、更新前のタスク情報を取得
    const originalTask = this.getTaskById(id);
    
    const updates: string[] = [];
    const params: any = { id };

    if (input.title !== undefined) {
      updates.push('title = @title');
      params.title = input.title;
    }
    if (input.description !== undefined) {
      updates.push('description = @description');
      // nullの場合はデータベースのNULLとして保存、空文字列もNULLとして扱う
      params.description = input.description === '' ? null : input.description;
    }
    if (input.status !== undefined) {
      updates.push('status = @status');
      params.status = input.status;
      if (input.status === 'completed') {
        updates.push('completed_at = datetime(\'now\', \'localtime\')');
      }
    }
    if (input.priority !== undefined) {
      updates.push('priority = @priority');
      params.priority = input.priority;
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
    // Check if routine columns and time columns exist before trying to update them
    const db = this.getDb();
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = (tableInfo as any[]).map(col => col.name);
    const hasRoutineColumns = columnNames.includes('is_routine');
    const hasNewDateColumns = columnNames.includes('start_date') && columnNames.includes('end_date');
    const hasTimeColumns = columnNames.includes('start_time') && columnNames.includes('end_time');
    
    // Handle date and time updates - only if columns exist
    if (hasNewDateColumns && 'startDate' in input) {
      updates.push('start_date = @startDate');
      params.startDate = input.startDate || null;
    }
    if (hasTimeColumns && 'startTime' in input) {
      updates.push('start_time = @startTime');
      params.startTime = input.startTime || null;
    }
    if (hasNewDateColumns && 'endDate' in input) {
      updates.push('end_date = @endDate');
      params.endDate = input.endDate || null;
    }
    if (hasTimeColumns && 'endTime' in input) {
      updates.push('end_time = @endTime');
      params.endTime = input.endTime || null;
    }
    
    if (hasRoutineColumns && input.isRoutine !== undefined) {
      updates.push('is_routine = @isRoutine');
      params.isRoutine = input.isRoutine ? 1 : 0;
    }
    if (hasRoutineColumns && input.routineType !== undefined) {
      updates.push('routine_type = @routineType');
      params.routineType = input.routineType;
    }

    if (updates.length === 0) return this.getTaskById(id);
    const stmt = db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = @id
    `);

    stmt.run(params);

    // タグの更新
    if (input.tagIds !== undefined) {
      // 現在のタグを全て削除
      const db = this.getDb();
      db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
      
      // 新しいタグを追加
      if (input.tagIds.length > 0) {
        for (const tagId of input.tagIds) {
          this.addTagToTask(id, tagId);
        }
      }
    }

    // ステータスが更新された場合、親タスクのステータスを自動更新
    if (input.status !== undefined) {
      this.updateParentTaskStatuses(id);
    }
    
    // 親タスクが変更された場合、旧親と新親の両方のステータスを更新
    if (input.parentId !== undefined && originalTask) {
      const db = this.getDb();
      
      // 旧親タスクのステータスを更新（移動前の親）
      if (originalTask.parentId && originalTask.parentId !== input.parentId) {
        // 元の親タスクの子タスクを取得し、他に子がいるか確認
        const siblingTasks = db.prepare(`
          SELECT id FROM tasks WHERE parent_id = ? AND id != ?
        `).all(originalTask.parentId, id) as { id: number }[];
        
        if (siblingTasks.length > 0) {
          // 他に子タスクがある場合は兄弟タスクのIDで更新
          if (siblingTasks[0]) {
            this.updateParentTaskStatuses(siblingTasks[0].id);
          }
        } else {
          // 子タスクがいなくなった場合は親タスクをpendingにリセット
          this.resetParentTaskStatus(originalTask.parentId);
        }
      }
      
      // 新親タスクのステータスを更新（移動後の親）
      if (input.parentId) {
        this.updateParentTaskStatuses(id);
      }
    }

    return this.getTaskWithChildren(id);
  }

  // 親タスクのステータスを子タスクがない場合にリセット
  private resetParentTaskStatus(parentId: number): void {
    const db = this.getDb();
    // 子タスクが全て削除された場合、親タスクのステータスを pending に戻す
    db.prepare(`
      UPDATE tasks SET status = 'pending', completed_at = NULL WHERE id = ?
    `).run(parentId);
    
    // 再帰的に祖父タスクもチェック
    const parentTask = this.getTaskById(parentId);
    if (parentTask && parentTask.parentId) {
      this.updateParentTaskStatuses(parentId);
    }
  }

  // 親タスクのステータスを子タスクに基づいて自動更新
  private updateParentTaskStatuses(childTaskId: number): void {
    const task = this.getTaskById(childTaskId);
    if (!task || !task.parentId) {
      return;
    }

    const parentId = task.parentId;
    
    // 親タスクの情報を取得
    const parentTask = this.getTaskById(parentId);
    if (!parentTask) {
      return;
    }
    
    // 親タスクの全ての子タスクのステータスを取得
    const db = this.getDb();
    const childStatuses = db.prepare(`
      SELECT status FROM tasks WHERE parent_id = ?
    `).all(parentId) as { status: string }[];

    const statuses = childStatuses.map(child => child.status);
    
    // 新しいステータスを計算
    let newStatus: string;
    
    // 全て未着手の場合（最優先でチェック）
    if (statuses.every(status => status === 'pending')) {
      newStatus = 'pending';
    }
    // 全て完了している場合
    else if (statuses.every(status => status === 'completed')) {
      newStatus = 'completed';
    }
    // 1つでも進行中がある場合
    else if (statuses.some(status => status === 'in_progress')) {
      newStatus = 'in_progress';
    }
    // 1つでも完了がある場合（進行中がない場合）
    else if (statuses.some(status => status === 'completed')) {
      newStatus = 'in_progress';
    }
    // その他の場合
    else {
      newStatus = 'in_progress';
    }

    // 現在の親タスクのステータスと比較
    if (parentTask.status === newStatus) {
      return;
    }

    // 親タスクのステータスを更新
    if (newStatus === 'completed') {
      db.prepare(`
        UPDATE tasks SET status = ?, completed_at = datetime('now', 'localtime') WHERE id = ?
      `).run(newStatus, parentId);
    } else {
      db.prepare(`
        UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?
      `).run(newStatus, parentId);
    }

    // 再帰的に祖父タスクもチェック
    this.updateParentTaskStatuses(parentId);
  }

  // タスクを削除（子タスクも自動的に削除される）
  deleteTask(id: number): boolean {
    const db = this.getDb();
    
    // 削除前に親タスクのIDを取得
    const taskToDelete = this.getTaskById(id);
    const parentId = taskToDelete?.parentId;
    
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    
    // 削除が成功し、親タスクがある場合は親タスクのステータスを自動更新
    if (result.changes > 0 && parentId) {
      // 親タスクのIDを使って自動更新（削除されたタスクのIDは使用不可）
      const parentTask = this.getTaskById(parentId);
      if (parentTask) {
        // 親タスクの任意の子タスクを取得して updateParentTaskStatuses を呼び出す
        const childTasks = this.getChildrenByParentId(parentId);
        if (childTasks.length > 0) {
          // 子タスクがある場合は、最初の子タスクのIDを使用
          if (childTasks[0]) {
            this.updateParentTaskStatuses(childTasks[0].id);
          }
        } else {
          // 子タスクがない場合は、親タスクの状態を直接更新
          this.resetParentTaskStatus(parentId);
        }
      }
    }
    
    return result.changes > 0;
  }

  // タグを作成（既存の場合は取得）
  createTag(name: string, color: string = '#808080', textColor: string = '#000000'): Tag {
    const db = this.getDb();
    // まず既存のタグを検索
    const existingTag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag | undefined;
    
    if (existingTag) {
      return existingTag;
    }
    
    // 存在しない場合は新規作成
    const stmt = db.prepare('INSERT INTO tags (name, color, text_color) VALUES (?, ?, ?)');
    const result = stmt.run(name, color, textColor);
    
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  }

  // タスクにタグを追加
  addTagToTask(taskId: number, tagId: number): void {
    const db = this.getDb();
    const stmt = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
    stmt.run(taskId, tagId);
  }

  // タスクからタグを削除
  removeTagFromTask(taskId: number, tagId: number): void {
    const db = this.getDb();
    const stmt = db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?');
    stmt.run(taskId, tagId);
  }

  // タスクのタグを取得
  getTagsByTaskId(taskId: number): Tag[] {
    const db = this.getDb();
    return db.prepare(`
      SELECT t.* FROM tags t
      JOIN task_tags tt ON t.id = tt.tag_id
      WHERE tt.task_id = ?
    `).all(taskId) as Tag[];
  }

  // 全タグを取得
  getAllTags(): Tag[] {
    const db = this.getDb();
    return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  }

  // タグを更新
  updateTag(id: number, name: string, color: string, textColor: string): Tag | null {
    const db = this.getDb();
    const stmt = db.prepare('UPDATE tags SET name = ?, color = ?, text_color = ? WHERE id = ?');
    const result = stmt.run(name, color, textColor, id);
    
    if (result.changes > 0) {
      return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
    }
    return null;
  }

  // タグを削除
  deleteTag(id: number): boolean {
    const db = this.getDb();
    // まず関連するタスクタグを削除
    db.prepare('DELETE FROM task_tags WHERE tag_id = ?').run(id);
    // タグ自体を削除
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 添付ファイルを追加
  addAttachment(taskId: number, fileName: string, filePath: string, fileSize?: number, mimeType?: string): Attachment {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO attachments (task_id, file_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(taskId, fileName, filePath, fileSize || null, mimeType || null);
    
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid) as Attachment;
  }

  // タスクの添付ファイルを取得
  getAttachmentsByTaskId(taskId: number): Attachment[] {
    const db = this.getDb();
    return db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(taskId) as Attachment[];
  }

  // コメントを追加
  addComment(taskId: number, content: string): Comment {
    const db = this.getDb();
    const stmt = db.prepare('INSERT INTO comments (task_id, content) VALUES (?, ?)');
    const result = stmt.run(taskId, content);
    
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid) as Comment;
  }

  // タスクのコメントを取得
  getCommentsByTaskId(taskId: number): Comment[] {
    const db = this.getDb();
    return db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as Comment[];
  }

  // ツリー構造を構築するヘルパー関数（最適化版）
  private buildTree(tasks: Task[]): Task[] {
    if (tasks.length === 0) return [];

    const taskMap = new Map<number, Task>();
    const childrenMap = new Map<number, Task[]>(); // 親ID -> 子タスク配列

    // 全てのタスクをマップに追加し、親子関係を整理
    for (const task of tasks) {
      const taskWithChildren = { ...task, children: [] };
      taskMap.set(task.id, taskWithChildren);
      
      if (task.parentId === null) {
        // ルートタスクの場合は何もしない（後で処理）
      } else {
        // 子タスクの場合は親ID別に整理
        if (!childrenMap.has(task.parentId)) {
          childrenMap.set(task.parentId, []);
        }
        childrenMap.get(task.parentId)!.push(taskWithChildren);
      }
    }

    // 各親の子タスクをposition順でソート
    for (const [parentId, children] of childrenMap) {
      children.sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // 親タスクに子タスクを追加
      const parent = taskMap.get(parentId);
      if (parent) {
        parent.children = children;
      }
    }

    // ルートタスクを収集してposition順でソート
    const rootTasks: Task[] = [];
    for (const task of tasks) {
      if (task.parentId === null) {
        const rootTask = taskMap.get(task.id);
        if (rootTask) {
          rootTasks.push(rootTask);
        }
      }
    }

    rootTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
    return rootTasks;
  }

  // 全てのルーティンタスクを取得
  getRoutineTasks(): Task[] {
    const db = this.getDb();
    
    // Check if routine columns exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = (tableInfo as any[]).map(col => col.name);
    const hasRoutineColumns = columnNames.includes('is_routine');
    
    if (!hasRoutineColumns) {
      // If routine columns don't exist, return empty array
      return [];
    }
    
    const tasks = db.prepare(`
      SELECT id, parent_id as parentId, title, description, status, priority,
             created_at as createdAt, updated_at as updatedAt,
             completed_at as completedAt, position, expanded,
             is_routine as isRoutine, routine_type as routineType,
             last_generated_at as lastGeneratedAt, routine_parent_id as routineParentId
      FROM tasks 
      WHERE is_routine = 1
      ORDER BY position
    `).all() as Task[];

    // NULLを空文字列に正規化
    return tasks.map(task => ({
      ...task,
      description: task.description || ''
    }));
  }

  // デイリールーティンタスクを生成
  generateDailyRoutineTasks(): boolean {
    const db = this.getDb();
    
    try {
      // 今日の日付を取得（時間は00:00:00）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      
      // 昨日の日付を取得
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTimestamp = yesterday.getTime();
      
      // デイリールーティンタスクを取得（今日まだ生成されていないもの）
      const routineTasks = db.prepare(`
        SELECT id, title, description, priority,
               is_routine as isRoutine, routine_type as routineType,
               last_generated_at as lastGeneratedAt
        FROM tasks 
        WHERE is_routine = 1 
          AND routine_type = 'daily'
          AND (last_generated_at IS NULL OR last_generated_at < ?)
      `).all(todayTimestamp) as any[];
      
      if (routineTasks.length === 0) {
        return true; // 生成するタスクがない場合も成功とする
      }
      
      // 各ルーティンタスクから今日のタスクを生成
      const insertTask = db.prepare(`
        INSERT INTO tasks (
          parent_id, title, description, status, priority,
          created_at, updated_at, position,
          is_routine, routine_type, routine_parent_id
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, 0, NULL, ?)
      `);
      
      const updateLastGenerated = db.prepare(`
        UPDATE tasks 
        SET last_generated_at = ?
        WHERE id = ?
      `);
      
      const transaction = db.transaction(() => {
        for (const routineTask of routineTasks) {
          // 新しいタスクを作成
          insertTask.run(
            null, // parent_id - ルーティンから生成されたタスクはルートレベル
            routineTask.title,
            routineTask.description || '',
            routineTask.priority,
            todayTimestamp, // created_at
            todayTimestamp, // updated_at
            0, // position
            routineTask.id // routine_parent_id
          );
          
          // ルーティンタスクの最終生成日時を更新
          updateLastGenerated.run(todayTimestamp, routineTask.id);
        }
      });
      
      transaction();
      
      console.log(`Generated ${routineTasks.length} daily routine tasks for today`);
      return true;
      
    } catch (error) {
      console.error('Error generating daily routine tasks:', error);
      return false;
    }
  }

  // 既存のタスクの位置を修正する（全てのタスクが位置0になっている場合に使用）
  fixTaskPositions(): void {
    const db = this.getDb();
    // 全てのタスクをIDでソートして取得
    const allTasks = db.prepare(`
      SELECT id, parent_id as parentId
      FROM tasks
      ORDER BY id
    `).all() as Array<{id: number, parentId: number | null}>;
    
    // 親IDごとにグループ化
    const tasksByParent = new Map<number | null, number[]>();
    allTasks.forEach(task => {
      const parentId = task.parentId;
      if (!tasksByParent.has(parentId)) {
        tasksByParent.set(parentId, []);
      }
      tasksByParent.get(parentId)!.push(task.id);
    });
    
    // 各親グループ内でpositionを設定
    tasksByParent.forEach((taskIds, parentId) => {
      taskIds.forEach((taskId, index) => {
        db.prepare(`
          UPDATE tasks SET position = ? WHERE id = ?
        `).run(index, taskId);
      });
    });
  }

  // データベースを閉じる
  close(): void {
    const db = this.getDb();
    db.close();
  }
}