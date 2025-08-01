/**
 * Core task type definitions
 * Clean, modern type definitions for the task management system
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RoutineType = 'daily' | 'weekly' | 'monthly';

/**
 * Core task interface - used throughout the application layer
 * Uses modern camelCase naming conventions
 */
export interface BaseTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string; // 開始日（YYYY-MM-DD）
  startTime?: string; // 開始時刻（HH:MM）
  endDate?: string; // 終了日（YYYY-MM-DD）
  endTime?: string; // 終了時刻（HH:MM）
  createdAt?: string;
  completedAt?: string;
  parentId?: number;
  position?: number; // Task position for ordering
  tagIds?: number[];
  // Routine task fields
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  lastGeneratedAt?: string | null;
  routineParentId?: number | null;
}

/**
 * Task with hierarchical structure and UI state
 */
export interface TaskWithChildren extends BaseTask {
  children?: TaskWithChildren[];
  expanded?: boolean;
  tags?: import('./tag').Tag[];
  isParentInFilter?: boolean; // Flag for filtered parent tasks
}

/**
 * Main Task type used throughout the application
 */
export type Task = TaskWithChildren;

/**
 * Database task fields - using snake_case as stored in SQLite
 * Used for data transformation between DB and application layers
 */
export interface DatabaseTaskFields {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string; // 開始日（YYYY-MM-DD）
  start_time?: string; // 開始時刻（HH:MM）
  end_date?: string; // 終了日（YYYY-MM-DD）
  end_time?: string; // 終了時刻（HH:MM）
  created_at?: string;
  completed_at?: string;
  parent_id?: number;
  position?: number;
  tag_ids?: number[];
  is_routine?: boolean;
  routine_type?: RoutineType | null;
  last_generated_at?: string | null;
  routine_parent_id?: number | null;
  expanded?: boolean;
}

/**
 * API Task type for external interfaces
 * Supports both naming conventions for backward compatibility
 */
export type ApiTask = BaseTask & {
  children?: ApiTask[];
  expanded?: boolean;
  // Legacy fields for backward compatibility
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  created_at?: string;
  completed_at?: string;
  is_routine?: boolean;
  routine_type?: RoutineType | null;
  last_generated_at?: string | null;
  routine_parent_id?: number | null;
  tag_ids?: number[];
};

/**
 * Transforms API task to application format
 * Handles snake_case to camelCase conversion
 */
export const transformApiTask = (apiTask: ApiTask): Task => {
  const transformed: Task = {
    ...apiTask,
    startDate: apiTask.startDate ?? apiTask.start_date,
    startTime: apiTask.startTime ?? apiTask.start_time,
    endDate: apiTask.endDate ?? apiTask.end_date,
    endTime: apiTask.endTime ?? apiTask.end_time,
    createdAt: apiTask.createdAt ?? apiTask.created_at,
    completedAt: apiTask.completedAt ?? apiTask.completed_at,
    isRoutine: apiTask.isRoutine ?? apiTask.is_routine,
    routineType: apiTask.routineType ?? apiTask.routine_type,
    lastGeneratedAt: apiTask.lastGeneratedAt ?? apiTask.last_generated_at,
    routineParentId: apiTask.routineParentId ?? apiTask.routine_parent_id,
    tagIds: apiTask.tagIds ?? apiTask.tag_ids,
  };

  // Recursively transform children
  if (apiTask.children && apiTask.children.length > 0) {
    transformed.children = apiTask.children.map(transformApiTask);
  }

  return transformed;
};

/**
 * Transforms application task to database format
 * Handles camelCase to snake_case conversion
 */
export const transformToDbTask = (task: Task): DatabaseTaskFields => {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    start_date: task.startDate,
    start_time: task.startTime,
    end_date: task.endDate,
    end_time: task.endTime,
    created_at: task.createdAt,
    completed_at: task.completedAt,
    parent_id: task.parentId,
    position: task.position,
    tag_ids: task.tagIds,
    is_routine: task.isRoutine,
    routine_type: task.routineType,
    last_generated_at: task.lastGeneratedAt,
    routine_parent_id: task.routineParentId,
    expanded: task.expanded,
  };
};

// Task creation payload
export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:MM
  parentId?: number;
  position?: number;
}

// Task update payload
export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  id: number;
}

// Task filters
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: number[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
}

// Task statistics
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}