/**
 * Task-related constants
 * Centralizes magic values scattered across components
 */

import { TaskStatus, TaskPriority } from '../types';

// Task status constants
export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#6b7280',      // 灰色
  in_progress: '#3b82f6',  // 青色
  completed: '#10b981'     // 緑色
};

// Priority constants
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急'
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444'
};

// Task form defaults
export const DEFAULT_TASK_VALUES = {
  status: 'pending' as TaskStatus,
  priority: 'medium' as TaskPriority,
  title: '',
  description: ''
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Timeouts and delays (in milliseconds)
export const TASK_SAVE_DEBOUNCE = 300;
export const MODAL_ANIMATION_DURATION = 200;
export const TOAST_DURATION = 3000;