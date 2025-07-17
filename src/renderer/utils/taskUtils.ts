/**
 * Task utility functions
 * Eliminates duplication of task processing logic across components
 */

import { Task, TaskStatus, ApiTask, transformApiTask } from '../types';

/**
 * Flattens a hierarchical task tree into a flat array
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

// Re-export transformation functions from types
export { transformApiTask as normalizeTask, transformApiTask } from '../types/task';

/**
 * Normalizes an array of API tasks
 */
export const normalizeTasks = (apiTasks: ApiTask[]): Task[] => {
  return apiTasks.map(transformApiTask);
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
 * Finds a task by ID in a hierarchical task tree
 */
export const findTaskById = (tasks: Task[], taskId: number): Task | null => {
  const findTask = (taskList: Task[]): Task | null => {
    for (const task of taskList) {
      if (task.id === taskId) {
        return task;
      }
      if (task.children) {
        const found = findTask(task.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };
  
  return findTask(tasks);
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
  if (!(task.children && task.children.length > 0)) {
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

/**
 * ステータスに応じた色を取得
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#10b981';
    case 'in_progress':
      return '#3b82f6';
    case 'pending':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

/**
 * 優先度に応じた色を取得
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return '#ef4444';
    case 'high':
      return '#f59e0b';
    case 'medium':
      return '#3b82f6';
    case 'low':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

/**
 * ステータスの日本語表示名を取得
 */
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return '未着手';
    case 'in_progress':
      return '進行中';
    case 'completed':
      return '完了';
    default:
      return '未着手';
  }
};

/**
 * 優先度の日本語表示名を取得
 */
export const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'low':
      return '低';
    case 'medium':
      return '中';
    case 'high':
      return '高';
    case 'urgent':
      return '緊急';
    default:
      return '中';
  }
};

/**
 * タスクが今日完了したかを判定
 */
export const isCompletedToday = (task: Task): boolean => {
  if (task.status !== 'completed' || !task.completedAt) {
    return false;
  }
  
  const completedDate = new Date(task.completedAt);
  const today = new Date();
  
  return completedDate.toDateString() === today.toDateString();
};

/**
 * 特定のタスクの子孫タスクを取得
 */
export const getDescendantTasks = (task: Task): Task[] => {
  const descendants: Task[] = [];
  
  const collect = (currentTask: Task) => {
    if (currentTask.children) {
      for (const child of currentTask.children) {
        descendants.push(child);
        collect(child);
      }
    }
  };
  
  collect(task);
  return descendants;
};

/**
 * タスクの深度を計算
 */
export const getTaskDepth = (task: Task, allTasks: Task[]): number => {
  let depth = 0;
  let currentTask = task;
  
  while (currentTask.parentId) {
    const parent = allTasks.find(t => t.id === currentTask.parentId);
    if (parent) {
      currentTask = parent;
      depth++;
    } else {
      break;
    }
  }
  
  return depth;
};

/**
 * タスクのルートを取得
 */
export const getRootTask = (task: Task, allTasks: Task[]): Task => {
  let currentTask = task;
  
  while (currentTask.parentId) {
    const parent = allTasks.find(t => t.id === currentTask.parentId);
    if (parent) {
      currentTask = parent;
    } else {
      break;
    }
  }
  
  return currentTask;
};

/**
 * タスクの統計情報を計算
 */
export const calculateTaskStats = (tasks: Task[]) => {
  const flatTasks = flattenTasks(tasks);
  
  const stats = {
    total: flatTasks.length,
    completed: flatTasks.filter(t => t.status === 'completed').length,
    inProgress: flatTasks.filter(t => t.status === 'in_progress').length,
    pending: flatTasks.filter(t => t.status === 'pending').length,
    overdue: flatTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      const now = new Date();
      return dueDate < now && t.status !== 'completed';
    }).length
  };
  
  return stats;
};

