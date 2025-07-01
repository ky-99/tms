/**
 * 統合型定義 - タスク管理システム
 * 
 * 思考プロセス：
 * 1. 重複する型定義を統合してメンテナンス性向上
 * 2. Legacy fieldサポートを段階的に削除するための移行戦略
 * 3. 型安全性を向上させつつ、既存コードとの互換性を保持
 * 4. 将来の拡張性を考慮した設計
 */

// ===== Core Types =====
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RoutineType = 'daily' | 'weekly' | 'monthly';

// ===== Task Interface (Modern) =====
export interface Task {
  id: number;
  parentId: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  position: number;
  expanded?: boolean;
  
  // 関連データ
  children?: Task[];
  tags?: Tag[];
  attachments?: Attachment[];
  comments?: Comment[];
  
  // ルーティンタスク
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  lastGeneratedAt?: string | null;
  routineParentId?: number | null;
}

// ===== Legacy Support Type =====
/**
 * レガシーAPIとの互換性のためのMixin型
 * 段階的な移行が完了次第削除予定
 */
export interface LegacyTaskFields {
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  is_routine?: boolean;
  routine_type?: RoutineType | null;
  last_generated_at?: string | null;
  routine_parent_id?: number | null;
}

export type TaskWithLegacy = Task & LegacyTaskFields;

// ===== Utility Types =====
export interface CreateTaskInput {
  parentId?: number | null;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  position?: number;
  expanded?: boolean;
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  routineParentId?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  parentId?: number | null;
  position?: number;
  expanded?: boolean;
  isRoutine?: boolean;
  routineType?: RoutineType | null;
}

// ===== Related Types =====
export interface Tag {
  id: number;
  name: string;
  color: string;
  textColor?: string;
  createdAt: Date;
}

export interface Attachment {
  id: number;
  taskId: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
}

export interface Comment {
  id: number;
  taskId: number;
  content: string;
  createdAt: Date;
}

// ===== Filter and Search Types =====
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: number[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
  isRoutine?: boolean;
  parentId?: number | null;
}

// ===== Statistics and Analytics =====
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  routine: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ProgressData {
  date: string;
  completed: number;
  total: number;
  completionRate: number;
}

// ===== UI Helper Types =====
export interface TaskCardState {
  isRoutine: boolean;
  isParent: boolean;
  isCompleted: boolean;
  isOverdue: boolean;
  dueDateText: string | null;
  statusText: string;
  priorityText: string;
}

// ===== Type Guards =====
export function isTask(obj: any): obj is Task {
  return obj && typeof obj.id === 'number' && typeof obj.title === 'string';
}

export function isTaskWithLegacy(obj: any): obj is TaskWithLegacy {
  return isTask(obj);
}

// ===== Migration Utilities =====
export function normalizeTask(task: TaskWithLegacy): Task {
  return {
    ...task,
    dueDate: task.dueDate || task.due_date || null,
    createdAt: task.createdAt || task.created_at,
    updatedAt: task.updatedAt || task.updated_at,
    completedAt: task.completedAt || task.completed_at || null,
    isRoutine: task.isRoutine || task.is_routine || false,
    routineType: task.routineType || task.routine_type || null,
    lastGeneratedAt: task.lastGeneratedAt || task.last_generated_at || null,
    routineParentId: task.routineParentId || task.routine_parent_id || null,
  };
}

export function denormalizeTaskForAPI(task: Task): TaskWithLegacy {
  return {
    ...task,
    due_date: task.dueDate,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
    is_routine: task.isRoutine,
    routine_type: task.routineType,
    last_generated_at: task.lastGeneratedAt,
    routine_parent_id: task.routineParentId,
  };
}