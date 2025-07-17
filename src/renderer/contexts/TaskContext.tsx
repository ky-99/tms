/**
 * Task Context - Unified context that combines data and UI contexts
 * Provides a single interface for all task-related operations
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { TaskDataProvider, useTaskData } from './TaskDataContext';
import { TaskUIProvider, useTaskUI } from './TaskUIContext';
import { Task, Tag } from '../types';

// Combined context interface
interface TaskContextType {
  // Data properties
  tasks: Task[];
  tags: Tag[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  
  // UI properties
  expandedTasks: Set<number>;
  selectedTasks: Set<number>;
  viewMode: 'list' | 'tree' | 'calendar';
  filterState: any;
  
  // Data operations
  loadTasks: () => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<Task>;
  createTaskAfter: (taskData: Partial<Task>, afterTaskId: number) => Promise<Task>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  loadTags: () => Promise<void>;
  clearError: () => void;
  
  // UI operations
  toggleTaskExpansion: (taskId: number) => void;
  setExpandedTasks: (taskIds: Set<number>) => void;
  expandAll: (taskIds: number[]) => void;
  collapseAll: () => void;
  toggleTaskSelection: (taskId: number) => void;
  setSelectedTasks: (taskIds: Set<number>) => void;
  clearSelection: () => void;
  selectAll: (taskIds: number[]) => void;
  setViewMode: (mode: 'list' | 'tree' | 'calendar') => void;
  setFilterState: (state: any) => void;
}


// Create context
const TaskContext = createContext<TaskContextType | null>(null);

// Provider component that combines data and UI contexts
interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  return (
    <TaskDataProvider>
      <TaskUIProvider>
        <TaskContextProvider>
          {children}
        </TaskContextProvider>
      </TaskUIProvider>
    </TaskDataProvider>
  );
};

// Internal provider that creates the combined context value
const TaskContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dataContext = useTaskData();
  const uiContext = useTaskUI();

  const contextValue: TaskContextType = {
    // Data properties
    tasks: dataContext.tasks,
    tags: dataContext.tags,
    loading: dataContext.loading,
    initialized: dataContext.initialized,
    error: dataContext.error,
    
    // UI properties
    expandedTasks: uiContext.expandedTasks,
    selectedTasks: uiContext.selectedTasks,
    viewMode: uiContext.viewMode,
    filterState: uiContext.filterState,
    
    // Data operations
    loadTasks: dataContext.loadTasks,
    createTask: dataContext.createTask,
    createTaskAfter: dataContext.createTaskAfter,
    updateTask: dataContext.updateTask,
    deleteTask: dataContext.deleteTask,
    loadTags: dataContext.loadTags,
    clearError: dataContext.clearError,
    
    // UI operations
    toggleTaskExpansion: uiContext.toggleTaskExpansion,
    setExpandedTasks: uiContext.setExpandedTasks,
    expandAll: uiContext.expandAll,
    collapseAll: uiContext.collapseAll,
    toggleTaskSelection: uiContext.toggleTaskSelection,
    setSelectedTasks: uiContext.setSelectedTasks,
    clearSelection: uiContext.clearSelection,
    selectAll: uiContext.selectAll,
    setViewMode: uiContext.setViewMode,
    setFilterState: uiContext.setFilterState,
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

// Custom hook to use the task context
export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

// Export individual contexts for fine-grained access
export { useTaskData } from './TaskDataContext';
export { useTaskUI } from './TaskUIContext';