/**
 * Task UI Context - Separated UI state management for better performance
 * Handles task expansion, selection, and other UI-related state
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Action types for UI operations
type TaskUIAction =
  | { type: 'SET_EXPANDED_TASKS'; payload: Set<number> }
  | { type: 'TOGGLE_TASK_EXPANSION'; payload: number }
  | { type: 'SET_SELECTED_TASKS'; payload: Set<number> }
  | { type: 'TOGGLE_TASK_SELECTION'; payload: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ALL'; payload: number[] }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'tree' | 'calendar' }
  | { type: 'SET_FILTER_STATE'; payload: any };

// UI state interface
interface TaskUIState {
  expandedTasks: Set<number>;
  selectedTasks: Set<number>;
  viewMode: 'list' | 'tree' | 'calendar';
  filterState: any;
}

// Context interface for UI operations
interface TaskUIContextType extends TaskUIState {
  // Expansion operations
  toggleTaskExpansion: (taskId: number) => void;
  setExpandedTasks: (taskIds: Set<number>) => void;
  expandAll: (taskIds: number[]) => void;
  collapseAll: () => void;
  
  // Selection operations
  toggleTaskSelection: (taskId: number) => void;
  setSelectedTasks: (taskIds: Set<number>) => void;
  clearSelection: () => void;
  selectAll: (taskIds: number[]) => void;
  
  // View operations
  setViewMode: (mode: 'list' | 'tree' | 'calendar') => void;
  setFilterState: (state: any) => void;
}

// Initial state
const initialUIState: TaskUIState = {
  expandedTasks: new Set(),
  selectedTasks: new Set(),
  viewMode: 'list',
  filterState: null,
};

// UI reducer
const taskUIReducer = (state: TaskUIState, action: TaskUIAction): TaskUIState => {
  switch (action.type) {
    case 'SET_EXPANDED_TASKS':
      return { ...state, expandedTasks: action.payload };
    
    case 'TOGGLE_TASK_EXPANSION':
      const newExpanded = new Set(state.expandedTasks);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedTasks: newExpanded };
    
    case 'SET_SELECTED_TASKS':
      return { ...state, selectedTasks: action.payload };
    
    case 'TOGGLE_TASK_SELECTION':
      const newSelected = new Set(state.selectedTasks);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedTasks: newSelected };
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedTasks: new Set() };
    
    case 'SELECT_ALL':
      return { ...state, selectedTasks: new Set(action.payload) };
    
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    
    case 'SET_FILTER_STATE':
      return { ...state, filterState: action.payload };
    
    default:
      return state;
  }
};

// Create context
const TaskUIContext = createContext<TaskUIContextType | null>(null);

// Provider component
interface TaskUIProviderProps {
  children: ReactNode;
}

export const TaskUIProvider: React.FC<TaskUIProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(taskUIReducer, initialUIState);

  // Expansion operations
  const toggleTaskExpansion = (taskId: number) => {
    dispatch({ type: 'TOGGLE_TASK_EXPANSION', payload: taskId });
  };

  const setExpandedTasks = (taskIds: Set<number>) => {
    dispatch({ type: 'SET_EXPANDED_TASKS', payload: taskIds });
  };

  const expandAll = (taskIds: number[]) => {
    dispatch({ type: 'SET_EXPANDED_TASKS', payload: new Set(taskIds) });
  };

  const collapseAll = () => {
    dispatch({ type: 'SET_EXPANDED_TASKS', payload: new Set() });
  };

  // Selection operations
  const toggleTaskSelection = (taskId: number) => {
    dispatch({ type: 'TOGGLE_TASK_SELECTION', payload: taskId });
  };

  const setSelectedTasks = (taskIds: Set<number>) => {
    dispatch({ type: 'SET_SELECTED_TASKS', payload: taskIds });
  };

  const clearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
  };

  const selectAll = (taskIds: number[]) => {
    dispatch({ type: 'SELECT_ALL', payload: taskIds });
  };

  // View operations
  const setViewMode = (mode: 'list' | 'tree' | 'calendar') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const setFilterState = (filterState: any) => {
    dispatch({ type: 'SET_FILTER_STATE', payload: filterState });
  };

  const contextValue: TaskUIContextType = {
    ...state,
    toggleTaskExpansion,
    setExpandedTasks,
    expandAll,
    collapseAll,
    toggleTaskSelection,
    setSelectedTasks,
    clearSelection,
    selectAll,
    setViewMode,
    setFilterState,
  };

  return (
    <TaskUIContext.Provider value={contextValue}>
      {children}
    </TaskUIContext.Provider>
  );
};

// Custom hook to use the task UI context
export const useTaskUI = (): TaskUIContextType => {
  const context = useContext(TaskUIContext);
  if (!context) {
    throw new Error('useTaskUI must be used within a TaskUIProvider');
  }
  return context;
};