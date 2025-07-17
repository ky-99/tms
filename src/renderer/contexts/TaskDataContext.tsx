/**
 * Task Data Context - Separated data management for better performance
 * Handles task CRUD operations and core data state
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Task, Tag } from '../types';
import { taskAPI } from '../services';
import { workspaceService } from '../services/workspaceService';

// Action types for data operations
type TaskDataAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: number };

// Data state interface
interface TaskDataState {
  tasks: Task[];
  tags: Tag[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

// Context interface for data operations
interface TaskDataContextType extends TaskDataState {
  // Task operations
  loadTasks: () => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<Task>;
  createTaskAfter: (taskData: Partial<Task>, afterTaskId: number) => Promise<Task>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  
  // Tag operations
  loadTags: () => Promise<void>;
  
  // Error handling
  clearError: () => void;
}

// Initial state
const initialDataState: TaskDataState = {
  tasks: [],
  tags: [],
  loading: false,
  initialized: false,
  error: null,
};

// Data reducer
const taskDataReducer = (state: TaskDataState, action: TaskDataAction): TaskDataState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, loading: false, error: null, initialized: true };
    
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    
    case 'ADD_TASK':
      return { 
        ...state, 
        tasks: [...state.tasks, action.payload],
        error: null 
      };
    
    case 'UPDATE_TASK':
      const updateTaskRecursively = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === action.payload.id) {
            return action.payload;
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskRecursively(task.children)
            };
          }
          return task;
        });
      };
      
      return {
        ...state,
        tasks: updateTaskRecursively(state.tasks),
        error: null
      };
    
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const TaskDataContext = createContext<TaskDataContextType | null>(null);

// Provider component
interface TaskDataProviderProps {
  children: ReactNode;
}

export const TaskDataProvider: React.FC<TaskDataProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(taskDataReducer, initialDataState);

  // Task operations
  const loadTasks = useCallback(async () => {
    try {
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'タスクの読み込みに失敗しました' 
      });
    }
  }, []);

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    try {
      const newTask = await taskAPI.createTask(taskData);
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの作成に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const createTaskAfter = useCallback(async (taskData: Partial<Task>, afterTaskId: number): Promise<Task> => {
    try {
      const newTask = await taskAPI.createTaskAfter(taskData, afterTaskId);
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの作成に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const updateTask = useCallback(async (id: number, updates: Partial<Task>): Promise<Task> => {
    try {
      const updatedTask = await taskAPI.updateTask(id, updates);
      
      // Important changes require full reload
      if ('dueDate' in updates || 'due_date' in updates || 'status' in updates || 'isRoutine' in updates) {
        const tasks = await taskAPI.loadTasks();
        dispatch({ type: 'SET_TASKS', payload: tasks });
      } else {
        dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      }
      
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの更新に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (id: number): Promise<void> => {
    try {
      await taskAPI.deleteTask(id);
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの削除に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  // Tag operations
  const loadTags = useCallback(async () => {
    try {
      const tags = await window.taskAPI.getAllTags();
      dispatch({ type: 'SET_TAGS', payload: tags });
    } catch (error) {
      // Don't set error for tags as it's not critical
    }
  }, []);

  // Error handling
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const startTime = Date.now();
        
        const tasks = await taskAPI.loadTasks();
        dispatch({ type: 'SET_TASKS', payload: tasks });
        
        const tags = await window.taskAPI.getAllTags();
        dispatch({ type: 'SET_TAGS', payload: tags });
        
        // Minimum display time to prevent flicker
        const elapsed = Date.now() - startTime;
        if (elapsed < 200) {
          await new Promise(resolve => setTimeout(resolve, 200 - elapsed));
        }
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error instanceof Error ? error.message : 'データの読み込みに失敗しました' 
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initializeData();
    
    // Handle workspace changes
    const handleWorkspaceChange = async () => {
      try {
        const tasks = await taskAPI.loadTasks();
        dispatch({ type: 'SET_TASKS', payload: tasks });
        
        const tags = await window.taskAPI.getAllTags();
        dispatch({ type: 'SET_TAGS', payload: tags });
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error instanceof Error ? error.message : 'データの読み込みに失敗しました' 
        });
      }
    };
    
    const cleanup = workspaceService.onWorkspaceChanged(handleWorkspaceChange);
    
    return cleanup;
  }, []);

  const contextValue: TaskDataContextType = {
    ...state,
    loadTasks,
    createTask,
    createTaskAfter,
    updateTask,
    deleteTask,
    loadTags,
    clearError,
  };

  return (
    <TaskDataContext.Provider value={contextValue}>
      {children}
    </TaskDataContext.Provider>
  );
};

// Custom hook to use the task data context
export const useTaskData = (): TaskDataContextType => {
  const context = useContext(TaskDataContext);
  if (!context) {
    throw new Error('useTaskData must be used within a TaskDataProvider');
  }
  return context;
};