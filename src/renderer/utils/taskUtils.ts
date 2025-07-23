/**
 * Task utility functions
 * Eliminates duplication of task processing logic across components
 */

import { Task, TaskStatus, ApiTask, transformApiTask } from '../types';
import { combineDateAndTime } from './lightDateUtils';

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
 * 分離スキーマからの日時取得ヘルパー関数
 */
export const getTaskStartDateTime = (task: Task): Date | null => {
  if (task.startDate) {
    const combinedDateTime = combineDateAndTime(task.startDate, task.startTime || null);
    return combinedDateTime ? new Date(combinedDateTime) : new Date(task.startDate);
  }
  return null;
};

export const getTaskEndDateTime = (task: Task): Date | null => {
  if (task.endDate) {
    const combinedDateTime = combineDateAndTime(task.endDate, task.endTime || null);
    return combinedDateTime ? new Date(combinedDateTime) : new Date(task.endDate);
  }
  return null;
};

/**
 * タスクに時刻情報があるかチェック
 */
export const hasTaskTime = (task: Task): boolean => {
  return !!(task.startTime || task.endTime);
};


/**
 * Checks if a task is overdue (新スキーマ対応)
 */
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.endDate || task.status === 'completed') return false;
  
  const today = new Date();
  const endDateTime = getTaskEndDateTime(task);
  
  if (!endDateTime) return false;
  
  // 時刻情報がある場合は詳細比較、ない場合は日付のみ比較
  if (hasTaskTime(task)) {
    return endDateTime < today;
  } else {
    // 日付のみの場合は日付で比較
    today.setHours(0, 0, 0, 0);
    endDateTime.setHours(0, 0, 0, 0);
    return endDateTime < today;
  }
};

/**
 * Gets relative end date text (e.g., "明日", "2日後") - 新スキーマ対応
 */
export const getEndDateText = (task: Task): string | null => {
  if (!task.endDate) return null;
  
  const today = new Date();
  const endDateTime = getTaskEndDateTime(task);
  
  if (!endDateTime) return null;
  
  // 日付比較用に時刻をリセット
  today.setHours(0, 0, 0, 0);
  endDateTime.setHours(0, 0, 0, 0);
  
  const diffTime = endDateTime.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
  return `${diffDays}日後`;
};

// Legacy export for backwards compatibility
export { getEndDateText as getDueDateText };


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
/**
 * タスクの期間を取得（開始日〜終了日の表示用）- 新スキーマ対応
 */
export const getTaskDateRange = (task: Task): string | null => {
  const startDateTime = getTaskStartDateTime(task);
  const endDateTime = getTaskEndDateTime(task);
  
  // 日時フォーマット関数（新スキーマ対応）
  const formatDateTime = (dateTime: Date | null, hasTime: boolean): string => {
    if (!dateTime) return '未定';
    
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    
    // 時刻情報がない場合は時刻部分を「未定」と表示
    if (!hasTime) {
      return `${year}/${month}/${day} 未定`;
    }
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };
  
  // タスクに時刻情報があるかチェック
  const hasStartTime = !!(task.startTime);
  const hasEndTime = !!(task.endTime);
  
  // 終了日のみの場合
  if (endDateTime && !startDateTime) {
    return `〜${formatDateTime(endDateTime, hasEndTime)}`;
  }
  
  // 開始日のみの場合
  if (startDateTime && !endDateTime) {
    return `${formatDateTime(startDateTime, hasStartTime)}〜`;
  }
  
  // 開始日と終了日両方の場合
  if (startDateTime && endDateTime) {
    return `${formatDateTime(startDateTime, hasStartTime)} ~ ${formatDateTime(endDateTime, hasEndTime)}`;
  }
  
  return null;
};

export const calculateTaskStats = (tasks: Task[]) => {
  const flatTasks = flattenTasks(tasks);
  
  const stats = {
    total: flatTasks.length,
    completed: flatTasks.filter(t => t.status === 'completed').length,
    inProgress: flatTasks.filter(t => t.status === 'in_progress').length,
    pending: flatTasks.filter(t => t.status === 'pending').length,
    overdue: flatTasks.filter(t => {
      // 新スキーマ対応の期限切れ判定
      return isTaskOverdue(t);
    }).length
  };
  
  return stats;
};

