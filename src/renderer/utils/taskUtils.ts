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
  return {
    ...apiTask,
    dueDate: apiTask.dueDate || apiTask.due_date,
    createdAt: apiTask.createdAt || apiTask.created_at,
    completedAt: apiTask.completedAt || apiTask.completed_at,
  };
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
    'completed': '完了',
    'cancelled': 'キャンセル'
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
 * Filters tasks by various criteria
 */
export const filterTasks = (
  tasks: Task[],
  filters: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    search?: string;
    showOverdue?: boolean;
  }
): Task[] => {
  return tasks.filter(task => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false;
    }
    
    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) return false;
    }
    
    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(searchLower);
      const descMatch = task.description?.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch) return false;
    }
    
    // Overdue filter
    if (filters.showOverdue === true && !isTaskOverdue(task)) return false;
    if (filters.showOverdue === false && isTaskOverdue(task)) return false;
    
    return true;
  });
};

/**
 * Sorts tasks by various criteria
 */
export const sortTasks = (
  tasks: Task[],
  sortBy: 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt',
  direction: 'asc' | 'desc' = 'asc'
): Task[] => {
  const sorted = [...tasks].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
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
        const statusOrder = { 'pending': 1, 'in_progress': 2, 'completed': 3, 'cancelled': 4 };
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
  });
  
  return sorted;
};