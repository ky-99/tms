/**
 * Task Context - Global state management for tasks
 * Centralizes task data and operations across the application
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Task, Tag } from '../types';
import { taskAPI } from '../services';
import { calculateParentTaskStatus, isParentTask } from '../utils/taskUtils';

// Action types
type TaskAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: number }
  | { type: 'SET_EXPANDED_TASKS'; payload: Set<number> }
  | { type: 'TOGGLE_TASK_EXPANSION'; payload: number };

// State interface
interface TaskState {
  tasks: Task[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  expandedTasks: Set<number>;
}

// Context interface
interface TaskContextType extends TaskState {
  // Task operations
  loadTasks: () => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<Task>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  
  // Tag operations
  loadTags: () => Promise<void>;
  
  // UI state
  toggleTaskExpansion: (taskId: number) => void;
  setExpandedTasks: (taskIds: Set<number>) => void;
  
  // Error handling
  clearError: () => void;
}

// Initial state
const initialState: TaskState = {
  tasks: [],
  tags: [],
  loading: false,
  error: null,
  expandedTasks: new Set(),
};

// Reducer
const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, loading: false, error: null };
    
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
    
    default:
      return state;
  }
};

// Create context
const TaskContext = createContext<TaskContextType | null>(null);

// Provider component
interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // Task operations (内部用)
  const loadTasksInternal = async (skipUpdate: boolean = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const tasks = await taskAPI.loadTasks();
      
      // 初回読み込み時のみ親タスクのステータスを再計算
      if (!skipUpdate) {
        await updateAllParentTaskStatuses(tasks);
        // 更新後のタスクを再読み込み
        const updatedTasks = await taskAPI.loadTasks();
        dispatch({ type: 'SET_TASKS', payload: updatedTasks });
      } else {
        dispatch({ type: 'SET_TASKS', payload: tasks });
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'タスクの読み込みに失敗しました' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Task operations (公開用)
  const loadTasks = async () => {
    await loadTasksInternal(false);
  };

  const createTask = async (taskData: Partial<Task>): Promise<Task> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newTask = await taskAPI.createTask(taskData);
      // Reload all tasks to ensure proper parent-child relationships and tree structure
      await loadTasks();
      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの作成に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>): Promise<Task> => {
    try {
      // インライン編集の場合はローディング状態を表示しない（ちらつき防止）
      const updatedTask = await taskAPI.updateTask(id, updates);
      
      // 期限が変更された場合は、全タスクを再読み込みして並び順を更新
      if ('dueDate' in updates || 'due_date' in updates) {
        await loadTasks();
      } else {
        // 期限以外の変更は即座にローカル状態を更新
        dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
        
        // ステータスが変更された場合、親タスクのステータスも自動更新
        if ('status' in updates) {
          await updateParentTaskStatuses(id, state.tasks);
        }
      }
      
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの更新に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // 親タスクのステータスを自動更新する関数
  const updateParentTaskStatuses = async (childTaskId: number, tasks: Task[]): Promise<void> => {
    const findAndUpdateParents = async (taskList: Task[], targetId: number): Promise<Task | null> => {
      for (const task of taskList) {
        if (task.children) {
          // 直接の子タスクかチェック
          if (task.children.some(child => child.id === targetId)) {
            // 親タスクのステータスを再計算
            const newStatus = calculateParentTaskStatus(task);
            if (newStatus !== task.status) {
              try {
                await taskAPI.updateTask(task.id, { status: newStatus });
                // さらに上位の親タスクもチェック
                await findAndUpdateParents(tasks, task.id);
              } catch (error) {
                console.error('Failed to update parent task status:', error);
              }
            }
            return task;
          }
          
          // 再帰的に子タスクをチェック
          const found = await findAndUpdateParents(task.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    await findAndUpdateParents(tasks, childTaskId);
    // 親タスクの更新後、全タスクを再読み込み（skipUpdate=trueで無限ループを防ぐ）
    await loadTasksInternal(true);
  };

  // すべての親タスクのステータスを再計算する関数
  const updateAllParentTaskStatuses = async (tasks: Task[]): Promise<void> => {
    console.log('Updating all parent task statuses...');
    
    const updateTaskStatuses = async (taskList: Task[]): Promise<void> => {
      for (const task of taskList) {
        if (isParentTask(task)) {
          // 親タスクのステータスを再計算
          const newStatus = calculateParentTaskStatus(task);
          console.log(`Parent task "${task.title}" (ID: ${task.id}): current status = ${task.status}, calculated status = ${newStatus}`);
          
          if (newStatus !== task.status) {
            try {
              console.log(`Updating parent task "${task.title}" status from ${task.status} to ${newStatus}`);
              await taskAPI.updateTask(task.id, { status: newStatus });
            } catch (error) {
              console.error('Failed to update parent task status:', error);
            }
          }
        }
        
        // 子タスクも再帰的にチェック
        if (task.children && task.children.length > 0) {
          await updateTaskStatuses(task.children);
        }
      }
    };

    await updateTaskStatuses(tasks);
    console.log('Finished updating parent task statuses');
  };

  const deleteTask = async (id: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await taskAPI.deleteTask(id);
      // Reload all tasks to ensure proper tree structure after cascade deletion
      await loadTasks();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの削除に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Tag operations
  const loadTags = async () => {
    try {
      const tags = await window.taskAPI.getAllTags();
      dispatch({ type: 'SET_TAGS', payload: tags });
    } catch (error) {
      console.error('Failed to load tags:', error);
      // Don't set error for tags as it's not critical
    }
  };

  // UI state operations
  const toggleTaskExpansion = (taskId: number) => {
    dispatch({ type: 'TOGGLE_TASK_EXPANSION', payload: taskId });
  };

  const setExpandedTasks = (taskIds: Set<number>) => {
    dispatch({ type: 'SET_EXPANDED_TASKS', payload: taskIds });
  };

  // Error handling
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Load initial data
  useEffect(() => {
    loadTasks();
    loadTags();
  }, []);

  const contextValue: TaskContextType = {
    ...state,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    loadTags,
    toggleTaskExpansion,
    setExpandedTasks,
    clearError,
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