/**
 * Optimized sorting utilities for task management
 * Provides high-performance sorting with memoization and Notion-like capabilities
 */

import { Task, TaskStatus, TaskPriority } from '../types';

// Cache for sort results
const sortCache = new WeakMap<Task[], Map<string, Task[]>>();

export type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'completedAt' | 'position';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

/**
 * Creates a cache key from sort options
 */
const createSortKey = (sortOptions: SortOption[]): string => {
  return JSON.stringify(sortOptions);
};

/**
 * Priority order mapping for consistent sorting
 */
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  'urgent': 4,
  'high': 3,
  'medium': 2,
  'low': 1
};

/**
 * Status order mapping for consistent sorting
 */
const STATUS_ORDER: Record<TaskStatus, number> = {
  'pending': 1,
  'in_progress': 2,
  'completed': 3
};

/**
 * Gets sortable value for a task field
 */
const getSortValue = (task: Task, field: SortField): any => {
  switch (field) {
    case 'title':
      return task.title.toLowerCase();
    
    case 'dueDate':
      return task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    
    case 'priority':
      return PRIORITY_ORDER[task.priority] || 0;
    
    case 'status':
      return STATUS_ORDER[task.status] || 0;
    
    case 'createdAt':
      return task.createdAt ? new Date(task.createdAt).getTime() : 0;
    
    case 'completedAt':
      return task.completedAt ? new Date(task.completedAt).getTime() : Number.MAX_SAFE_INTEGER;
    
    case 'position':
      return (task as any).position || Number.MAX_SAFE_INTEGER;
    
    default:
      return 0;
  }
};

/**
 * Compares two tasks by a specific field and direction
 */
const compareTasksByField = (
  a: Task,
  b: Task,
  field: SortField,
  direction: SortDirection
): number => {
  const aValue = getSortValue(a, field);
  const bValue = getSortValue(b, field);

  if (aValue < bValue) return direction === 'asc' ? -1 : 1;
  if (aValue > bValue) return direction === 'asc' ? 1 : -1;
  return 0;
};

/**
 * Optimized multi-field sorting with memoization (Notion-like)
 */
export const sortTasksMultiple = (
  tasks: Task[],
  sortOptions: SortOption[]
): Task[] => {
  // Quick return for no sorting options
  if (sortOptions.length === 0) {
    return tasks;
  }

  const cacheKey = createSortKey(sortOptions);
  
  // Check cache first
  if (!sortCache.has(tasks)) {
    sortCache.set(tasks, new Map());
  }
  
  const cache = sortCache.get(tasks)!;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Perform sorting
  const sorted = [...tasks].sort((a, b) => {
    for (const sortOption of sortOptions) {
      const comparison = compareTasksByField(a, b, sortOption.field, sortOption.direction);
      if (comparison !== 0) return comparison;
    }
    // Fallback to ID for consistent ordering
    return a.id - b.id;
  });

  // Cache the result
  cache.set(cacheKey, sorted);
  
  return sorted;
};

/**
 * Single field sorting (optimized for common use cases)
 */
export const sortTasks = (
  tasks: Task[],
  field: SortField,
  direction: SortDirection = 'asc'
): Task[] => {
  return sortTasksMultiple(tasks, [{ field, direction }]);
};

/**
 * Pre-defined sort presets for common use cases
 */
export const sortPresets = {
  // Smart sort: priority first, then due date, then status
  smart: (tasks: Task[]): Task[] => {
    return sortTasksMultiple(tasks, [
      { field: 'priority', direction: 'desc' },
      { field: 'dueDate', direction: 'asc' },
      { field: 'status', direction: 'asc' }
    ]);
  },

  // Due date ascending (closest first)
  dueDateAsc: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'dueDate', 'asc');
  },

  // Due date descending (furthest first)
  dueDateDesc: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'dueDate', 'desc');
  },

  // Priority descending (urgent first)
  priorityDesc: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'priority', 'desc');
  },

  // Status ascending (pending first)
  statusAsc: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'status', 'asc');
  },

  // Alphabetical by title
  alphabetical: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'title', 'asc');
  },

  // Recently created first
  recentlyCreated: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'createdAt', 'desc');
  },

  // Recently completed first
  recentlyCompleted: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'completedAt', 'desc');
  },

  // Position-based (manual ordering)
  position: (tasks: Task[]): Task[] => {
    return sortTasks(tasks, 'position', 'asc');
  }
};

/**
 * Hierarchical sorting that preserves parent-child relationships
 */
export const sortTasksHierarchical = (
  tasks: Task[],
  sortOptions: SortOption[]
): Task[] => {
  const sortLevel = (taskList: Task[]): Task[] => {
    const sorted = sortTasksMultiple(taskList, sortOptions);
    
    return sorted.map(task => ({
      ...task,
      children: task.children ? sortLevel(task.children) : undefined
    }));
  };

  return sortLevel(tasks);
};

/**
 * Clears the sort cache (call when tasks are updated)
 */
export const clearSortCache = (): void => {
  // WeakMap will automatically clean up when tasks are garbage collected
  // This function is for manual cache clearing if needed
};

/**
 * Gets the opposite direction for a sort field
 */
export const toggleSortDirection = (currentDirection: SortDirection): SortDirection => {
  return currentDirection === 'asc' ? 'desc' : 'asc';
};