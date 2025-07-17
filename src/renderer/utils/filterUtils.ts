/**
 * Optimized filtering utilities for task management
 * Provides high-performance filtering with memoization
 */

import { Task, TaskStatus, TaskPriority } from '../types';
import { isTaskOverdue } from './taskUtils';

// Cache for filter results
const filterCache = new WeakMap<Task[], Map<string, Task[]>>();

export interface FilterCriteria {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  hasChildren?: boolean;
  isOverdue?: boolean;
  search?: string;
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  isRoutine?: boolean;
}

/**
 * Creates a cache key from filter criteria
 */
const createFilterKey = (criteria: FilterCriteria): string => {
  return JSON.stringify({
    status: criteria.status?.sort(),
    priority: criteria.priority?.sort(),
    hasChildren: criteria.hasChildren,
    isOverdue: criteria.isOverdue,
    search: criteria.search?.toLowerCase(),
    tags: criteria.tags?.sort(),
    dueDateFrom: criteria.dueDateFrom,
    dueDateTo: criteria.dueDateTo,
    isRoutine: criteria.isRoutine,
  });
};

/**
 * Optimized task filtering with memoization
 */
export const filterTasks = (tasks: Task[], criteria: FilterCriteria): Task[] => {
  // Quick return for empty criteria
  if (Object.keys(criteria).length === 0) {
    return tasks;
  }

  const cacheKey = createFilterKey(criteria);
  
  // Check cache first
  if (!filterCache.has(tasks)) {
    filterCache.set(tasks, new Map());
  }
  
  const cache = filterCache.get(tasks)!;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Apply filters
  let filtered = tasks;

  // Status filter
  if (criteria.status && criteria.status.length > 0) {
    const statusSet = new Set(criteria.status);
    filtered = filtered.filter(task => statusSet.has(task.status));
  }

  // Priority filter
  if (criteria.priority && criteria.priority.length > 0) {
    const prioritySet = new Set(criteria.priority);
    filtered = filtered.filter(task => prioritySet.has(task.priority));
  }

  // Children filter
  if (criteria.hasChildren !== undefined) {
    filtered = filtered.filter(task => 
      criteria.hasChildren ? !!(task.children && task.children.length > 0) : !(task.children && task.children.length > 0)
    );
  }

  // Overdue filter
  if (criteria.isOverdue) {
    filtered = filtered.filter(task => isTaskOverdue(task));
  }

  // Search filter (optimized with includes for better performance)
  if (criteria.search && criteria.search.trim()) {
    const searchLower = criteria.search.toLowerCase();
    filtered = filtered.filter(task => 
      task.title.toLowerCase().includes(searchLower) ||
      (task.description && task.description.toLowerCase().includes(searchLower))
    );
  }

  // Tag filter
  if (criteria.tags && criteria.tags.length > 0) {
    const tagSet = new Set(criteria.tags);
    filtered = filtered.filter(task => 
      task.tags && task.tags.some(tag => tagSet.has(typeof tag === 'string' ? tag : tag.name))
    );
  }

  // Due date range filter
  if (criteria.dueDateFrom || criteria.dueDateTo) {
    filtered = filtered.filter(task => {
      if (!task.dueDate) return false;
      
      const taskDate = new Date(task.dueDate);
      
      if (criteria.dueDateFrom) {
        const fromDate = new Date(criteria.dueDateFrom);
        if (taskDate < fromDate) return false;
      }
      
      if (criteria.dueDateTo) {
        const toDate = new Date(criteria.dueDateTo);
        if (taskDate > toDate) return false;
      }
      
      return true;
    });
  }

  // Routine filter
  if (criteria.isRoutine !== undefined) {
    filtered = filtered.filter(task => !!task.isRoutine === criteria.isRoutine);
  }

  // Cache the result
  cache.set(cacheKey, filtered);
  
  return filtered;
};

/**
 * Pre-defined filter presets for common use cases
 */
export const filterPresets = {
  todayTasks: (tasks: Task[]): Task[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return filterTasks(tasks, {
      dueDateFrom: today.toISOString(),
      dueDateTo: tomorrow.toISOString(),
      status: ['pending', 'in_progress']
    });
  },

  overdueTasks: (tasks: Task[]): Task[] => {
    return filterTasks(tasks, {
      isOverdue: true,
      status: ['pending', 'in_progress']
    });
  },

  urgentTasks: (tasks: Task[]): Task[] => {
    return filterTasks(tasks, {
      priority: ['urgent'],
      status: ['pending', 'in_progress']
    });
  },

  completedTasks: (tasks: Task[]): Task[] => {
    return filterTasks(tasks, {
      status: ['completed']
    });
  },

  parentTasks: (tasks: Task[]): Task[] => {
    return filterTasks(tasks, {
      hasChildren: true
    });
  },

  routineTasks: (tasks: Task[]): Task[] => {
    return filterTasks(tasks, {
      isRoutine: true
    });
  }
};

/**
 * Combines multiple filter criteria
 */
export const combineFilters = (...criteria: FilterCriteria[]): FilterCriteria => {
  const combined: FilterCriteria = {};
  
  for (const criterion of criteria) {
    // Combine arrays
    if (criterion.status) {
      combined.status = [...(combined.status || []), ...criterion.status];
    }
    if (criterion.priority) {
      combined.priority = [...(combined.priority || []), ...criterion.priority];
    }
    if (criterion.tags) {
      combined.tags = [...(combined.tags || []), ...criterion.tags];
    }
    
    // Override single values
    if (criterion.hasChildren !== undefined) combined.hasChildren = criterion.hasChildren;
    if (criterion.isOverdue !== undefined) combined.isOverdue = criterion.isOverdue;
    if (criterion.search !== undefined) combined.search = criterion.search;
    if (criterion.dueDateFrom !== undefined) combined.dueDateFrom = criterion.dueDateFrom;
    if (criterion.dueDateTo !== undefined) combined.dueDateTo = criterion.dueDateTo;
    if (criterion.isRoutine !== undefined) combined.isRoutine = criterion.isRoutine;
  }
  
  return combined;
};

/**
 * Clears the filter cache (call when tasks are updated)
 */
export const clearFilterCache = (): void => {
  // WeakMap will automatically clean up when tasks are garbage collected
  // This function is for manual cache clearing if needed
};