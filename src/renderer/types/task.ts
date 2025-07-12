/**
 * Core task type definitions
 * Centralizes all task-related types to eliminate duplication
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RoutineType = 'daily' | 'weekly' | 'monthly';

export interface BaseTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;
  parentId?: number;
  tagIds?: number[];
  // Routine task fields
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  lastGeneratedAt?: string | null;
  routineParentId?: number | null;
}

export interface TaskWithChildren extends BaseTask {
  children?: TaskWithChildren[];
  expanded?: boolean;
  tags?: import('./tag').Tag[];
  isParentInFilter?: boolean; // Flag for filtered parent tasks
  // Routine task fields
  isRoutine?: boolean;
  is_routine?: boolean;
  routineType?: RoutineType | null;
  routine_type?: RoutineType | null;
  lastGeneratedAt?: string | null;
  last_generated_at?: string | null;
  routineParentId?: number | null;
  routine_parent_id?: number | null;
  // Legacy support for existing code
  due_date?: string;
  created_at?: string;
  completed_at?: string;
}

export type Task = TaskWithChildren;

// Legacy support for existing API responses
export interface LegacyTaskFields {
  due_date?: string;
  created_at?: string;
  completed_at?: string;
  is_routine?: boolean;
  routine_type?: RoutineType | null;
  last_generated_at?: string | null;
  routine_parent_id?: number | null;
}

export type ApiTask = BaseTask & LegacyTaskFields & {
  children?: ApiTask[];
  expanded?: boolean;
};

// Task creation payload
export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  parentId?: number;
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