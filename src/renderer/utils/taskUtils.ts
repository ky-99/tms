/**
 * Task utility functions
 * Eliminates duplication of task processing logic across components
 */

import { Task, TaskStatus, TaskPriority, ApiTask } from '../types';

/**
 * Flattens a hierarchical task tree into a flat array
 * Replaces 6+ duplicate implementations across components
 */
export const flattenTasks = (tasks: Task[]): Task[] => {
  const result: Task[] = [];
  
  const addTask = (task: Task) => {
    result.push(task);
    if (task.children) {
      task.children.forEach(addTask);
    }
  };
  
  tasks.forEach(addTask);
  return result;
};

/**
 * Normalizes API task data to consistent format
 * Handles legacy snake_case to camelCase conversion
 */
export const normalizeTask = (apiTask: ApiTask): Task => {
  const normalized = {
    ...apiTask,
    dueDate: apiTask.dueDate || apiTask.due_date,
    createdAt: apiTask.createdAt || apiTask.created_at,
    completedAt: apiTask.completedAt || apiTask.completed_at,
    // ルーティンタスクフィールドの正規化
    isRoutine: apiTask.isRoutine || (apiTask as any).is_routine,
    routineType: apiTask.routineType || (apiTask as any).routine_type,
    lastGeneratedAt: apiTask.lastGeneratedAt || (apiTask as any).last_generated_at,
    routineParentId: apiTask.routineParentId || (apiTask as any).routine_parent_id,
  };
  
  // Recursively normalize children if they exist
  if (apiTask.children && apiTask.children.length > 0) {
    normalized.children = apiTask.children.map(normalizeTask);
  }
  
  return normalized;
};

/**
 * Normalizes an array of API tasks
 */
export const normalizeTasks = (apiTasks: ApiTask[]): Task[] => {
  return apiTasks.map(normalizeTask);
};

/**
 * Gets localized status text
 * Centralizes status mapping logic
 */
export const getStatusText = (status: TaskStatus): string => {
  const statusMap: Record<TaskStatus, string> = {
    'pending': '未着手',
    'in_progress': '進行中', 
    'completed': '完了'
  };
  return statusMap[status];
};

/**
 * Gets localized priority text
 * Centralizes priority mapping logic
 */
export const getPriorityText = (priority: TaskPriority): string => {
  const priorityMap: Record<TaskPriority, string> = {
    'low': '低',
    'medium': '中',
    'high': '高',
    'urgent': '緊急'
  };
  return priorityMap[priority];
};

/**
 * Checks if a task is overdue
 */
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === 'completed') return false;
  
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
};

/**
 * Gets relative due date text (e.g., "明日", "2日後")
 */
export const getDueDateText = (task: Task): string | null => {
  if (!task.dueDate) return null;
  
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
  return `${diffDays}日後`;
};


/**
 * Checks if a task is a parent task (has children)
 */
export const isParentTask = (task: Task): boolean => {
  return !!(task.children && task.children.length > 0);
};

/**
 * Calculates the appropriate status for a parent task based on its children
 */
export const calculateParentTaskStatus = (task: Task): TaskStatus => {
  if (!isParentTask(task)) {
    return task.status; // 子タスクがない場合は現在のステータスを維持
  }

  const children = task.children!;
  const statuses = children.map(child => child.status);
  
  // 全て未着手の場合（最優先でチェック）
  if (statuses.every(status => status === 'pending')) {
    return 'pending';
  }
  
  // 全て完了している場合
  if (statuses.every(status => status === 'completed')) {
    return 'completed';
  }
  
  // 1つでも進行中がある場合
  if (statuses.some(status => status === 'in_progress')) {
    return 'in_progress';
  }
  
  // 1つでも完了がある場合（進行中がない場合）
  if (statuses.some(status => status === 'completed')) {
    return 'in_progress';
  }
  
  // その他の場合（混在状態）は進行中とする
  return 'in_progress';
};

export type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

/**
 * Sorts tasks by multiple criteria (Notion-like)
 */
export const sortTasksMultiple = (
  tasks: Task[],
  sortOptions: SortOption[]
): Task[] => {
  if (sortOptions.length === 0) return tasks;

  const sorted = [...tasks].sort((a, b) => {
    for (const sortOption of sortOptions) {
      const comparison = compareTasksByField(a, b, sortOption.field, sortOption.direction);
      if (comparison !== 0) return comparison;
    }
    return 0;
  });

  return sorted;
};

/**
 * Compares two tasks by a specific field
 */
const compareTasksByField = (
  a: Task,
  b: Task,
  field: SortField,
  direction: SortDirection
): number => {
  let aValue: any;
  let bValue: any;

  switch (field) {
    case 'title':
      aValue = a.title.toLowerCase();
      bValue = b.title.toLowerCase();
      break;
    case 'dueDate':
      aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      break;
    case 'priority':
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
      aValue = priorityOrder[a.priority];
      bValue = priorityOrder[b.priority];
      break;
    case 'status':
      const statusOrder = { 'pending': 1, 'in_progress': 2, 'completed': 3 };
      aValue = statusOrder[a.status];
      bValue = statusOrder[b.status];
      break;
    case 'createdAt':
      aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      break;
    default:
      return 0;
  }

  if (aValue < bValue) return direction === 'asc' ? -1 : 1;
  if (aValue > bValue) return direction === 'asc' ? 1 : -1;
  return 0;
};

