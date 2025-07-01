/**
 * 統合タスクユーティリティ
 * 
 * 思考プロセス：
 * 1. 重複するタスク処理ロジックを統合してDRY原則を適用
 * 2. 型安全性を向上させつつパフォーマンスを最適化
 * 3. 日付処理の一貫性を確保
 * 4. メモ化とキャッシュによる性能向上
 */

import { Task, TaskWithLegacy, TaskStatus, TaskPriority, TaskCardState, normalizeTask } from '../types';

// ===== Task Tree Operations =====

/**
 * タスクツリーを平坦化
 * 理由：複数のコンポーネントで同じロジックが重複していた
 */
export const flattenTasks = (tasks: Task[]): Task[] => {
  const result: Task[] = [];
  
  const addTask = (task: Task) => {
    result.push(task);
    if (task.children?.length) {
      task.children.forEach(addTask);
    }
  };
  
  tasks.forEach(addTask);
  return result;
};

/**
 * 平坦化されたタスクから階層構造を再構築
 */
export const buildTaskTree = (flatTasks: Task[]): Task[] => {
  if (flatTasks.length === 0) return [];

  const taskMap = new Map<number, Task>();
  const rootTasks: Task[] = [];

  // 最適化：一回のループで処理
  for (const task of flatTasks) {
    const taskWithChildren = { ...task, children: [] };
    taskMap.set(task.id, taskWithChildren);
    
    if (task.parentId === null) {
      rootTasks.push(taskWithChildren);
    }
  }

  // 親子関係の構築
  for (const task of flatTasks) {
    if (task.parentId !== null) {
      const parent = taskMap.get(task.parentId);
      const child = taskMap.get(task.id);
      if (parent && child) {
        parent.children!.push(child);
      }
    }
  }

  return rootTasks;
};

// ===== Date Processing Utilities =====

/**
 * 日付処理の統一ユーティリティ
 * 理由：異なるコンポーネントで異なる日付計算ロジックが使われていた
 */
export class DateUtils {
  /**
   * 今日の日付を00:00:00で取得（タイムゾーン一貫性確保）
   */
  static getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * 今日のタイムスタンプを取得（パフォーマンス最適化用）
   */
  static getTodayTimestamp(): number {
    return DateUtils.getToday().getTime();
  }

  /**
   * 週の範囲を取得（月曜日開始で統一）
   */
  static getWeekRange(referenceDate: Date = new Date()): { monday: Date; sunday: Date } {
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() - referenceDate.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }

  /**
   * 月の範囲を取得
   */
  static getMonthRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * 相対的な日付テキストを取得
   */
  static getRelativeDateText(date: string | Date): string | null {
    if (!date) return null;
    
    const targetDate = new Date(date);
    const today = DateUtils.getToday();
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    if (diffDays === -1) return '昨日';
    if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
    return `${diffDays}日後`;
  }
}

// ===== Task State Calculations =====

/**
 * タスクの状態を計算（メモ化対応）
 * 理由：TaskCardで重複していた計算ロジックを統合
 */
export const calculateTaskState = (task: Task): TaskCardState => {
  const isRoutine = task.isRoutine || false;
  const isParent = task.children && task.children.length > 0;
  const isCompleted = task.status === 'completed';
  
  let isOverdue = false;
  let dueDateText = null;
  
  if (task.dueDate && !isCompleted) {
    const today = DateUtils.getTodayTimestamp();
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    isOverdue = dueDate.getTime() < today;
    dueDateText = DateUtils.getRelativeDateText(task.dueDate);
  }

  return {
    isRoutine,
    isParent: Boolean(isParent),
    isCompleted,
    isOverdue,
    dueDateText,
    statusText: getStatusText(task.status),
    priorityText: getPriorityText(task.priority)
  };
};

// ===== Text Mapping =====

const STATUS_MAP: Record<TaskStatus, string> = {
  'pending': '未着手',
  'in_progress': '進行中',
  'completed': '完了',
  'cancelled': 'キャンセル'
};

const PRIORITY_MAP: Record<TaskPriority, string> = {
  'low': '低',
  'medium': '中',
  'high': '高',
  'urgent': '緊急'
};

export const getStatusText = (status: TaskStatus): string => STATUS_MAP[status];
export const getPriorityText = (priority: TaskPriority): string => PRIORITY_MAP[priority];

// ===== Task Filtering =====

/**
 * 今日のタスクをフィルタリング（ルーティンタスク対応）
 */
export const getTodayTasks = (tasks: Task[]): Task[] => {
  const today = DateUtils.getTodayTimestamp();
  const flatTasks = flattenTasks(tasks);

  return flatTasks.filter(task => {
    // ルーティンタスクは常に今日のタスクとして表示
    if (task.isRoutine) {
      return true;
    }
    
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today;
  });
};

/**
 * 期限切れタスクをフィルタリング
 */
export const getOverdueTasks = (tasks: Task[]): Task[] => {
  const today = DateUtils.getTodayTimestamp();
  const flatTasks = flattenTasks(tasks);

  return flatTasks.filter(task => {
    // ルーティンタスクは期限切れとして表示しない
    if (task.isRoutine) return false;
    
    if (!task.dueDate || task.status === 'completed') return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today;
  });
};

/**
 * 週次タスクをフィルタリング
 */
export const getWeeklyTasks = (tasks: Task[], referenceDate?: Date): Task[] => {
  const { monday, sunday } = DateUtils.getWeekRange(referenceDate);
  const flatTasks = flattenTasks(tasks);

  return flatTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= monday && dueDate <= sunday;
  });
};

// ===== Legacy Support =====

/**
 * レガシータスクの正規化
 * 理由：段階的な移行のためのサポート関数
 */
export const normalizeLegacyTask = (task: TaskWithLegacy): Task => {
  return normalizeTask(task);
};

export const normalizeLegacyTasks = (tasks: TaskWithLegacy[]): Task[] => {
  return tasks.map(normalizeLegacyTask);
};

// ===== Performance Optimized Utilities =====

/**
 * タスク統計を効率的に計算
 */
export const calculateTaskStats = (tasks: Task[]) => {
  const flatTasks = flattenTasks(tasks);
  const today = DateUtils.getTodayTimestamp();
  
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;
  let routine = 0;

  for (const task of flatTasks) {
    total++;
    
    switch (task.status) {
      case 'completed':
        completed++;
        break;
      case 'in_progress':
        inProgress++;
        break;
      case 'pending':
        pending++;
        break;
    }
    
    if (task.isRoutine) {
      routine++;
    }
    
    if (task.dueDate && task.status !== 'completed') {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() < today) {
        overdue++;
      }
    }
  }

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    routine
  };
};