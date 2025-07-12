/**
 * Task Context - Global state management for tasks
 * Centralizes task data and operations across the application
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Task, Tag } from '../types';
import { taskAPI } from '../services';
import { calculateParentTaskStatus, isParentTask } from '../utils/taskUtils';
import { workspaceService } from '../services/workspaceService';

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
  createTaskAfter: (taskData: Partial<Task>, afterTaskId: number) => Promise<Task>;
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
  const loadTasksInternal = useCallback(async (skipUpdate: boolean = false, showLoading: boolean = true) => {
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      const tasks = await taskAPI.loadTasks();
      
      // 親タスクのステータス自動更新は現在データベースレベルで処理されているため、
      // ここでの再計算は無効化（無限ループを防ぐため）
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'タスクの読み込みに失敗しました' 
      });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, []); // loadTasksInternalをuseCallbackでラップ

  // Task operations (公開用)
  const loadTasks = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'タスクの読み込みに失敗しました' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // 依存なしでシンプルに

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newTask = await taskAPI.createTask(taskData);
      // 親タスクの自動更新を反映するため全体再読み込み
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの作成に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createTaskAfter = useCallback(async (taskData: Partial<Task>, afterTaskId: number): Promise<Task> => {
    try {
      // 複製などの短時間操作ではローディング状態を表示しない（ちらつき防止）
      const newTask = await taskAPI.createTaskAfter(taskData, afterTaskId);
      // 位置調整のため全タスクを再読み込み（無限ループを避けるため直接実装）
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの作成に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []); // 依存なしでシンプルに

  const updateTask = useCallback(async (id: number, updates: Partial<Task>): Promise<Task> => {
    try {
      // インライン編集の場合はローディング状態を表示しない（ちらつき防止）
      const updatedTask = await taskAPI.updateTask(id, updates);
      
      // 重要な変更（期限、ステータス、ルーティン）の場合は全体再読み込みが必要
      if ('dueDate' in updates || 'due_date' in updates || 'status' in updates || 'isRoutine' in updates) {
        // 親タスクの自動更新や並び順の変更を反映するため全体再読み込み
        const tasks = await taskAPI.loadTasks();
        dispatch({ type: 'SET_TASKS', payload: tasks });
      } else {
        // その他の変更（タイトル、説明など）は即座にローカル状態を更新
        dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      }
      
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの更新に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  // 注意: 親タスクのステータス自動更新は現在データベースレベルで処理されています
  // この関数は非推奨となり、将来的に削除予定です

  // すべての親タスクのステータスを再計算する関数
  const updateAllParentTaskStatuses = async (tasks: Task[]): Promise<void> => {
    const updateTaskStatuses = async (taskList: Task[]): Promise<void> => {
      for (const task of taskList) {
        if (isParentTask(task)) {
          // 親タスクのステータスを再計算
          const newStatus = calculateParentTaskStatus(task);
          
          if (newStatus !== task.status) {
            try {
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
  };

  const deleteTask = useCallback(async (id: number): Promise<void> => {
    try {
      // 削除処理ではローディング状態を表示しない（ナビゲーション時のちらつき防止）
      await taskAPI.deleteTask(id);
      // カスケード削除後のツリー構造を確保するため全タスクを再読み込み（無限ループを避けるため直接実装）
      const tasks = await taskAPI.loadTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'タスクの削除に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []); // 依存なしでシンプルに

  // Tag operations
  const loadTags = useCallback(async () => {
    try {
      const tags = await window.taskAPI.getAllTags();
      dispatch({ type: 'SET_TAGS', payload: tags });
    } catch (error) {
      console.error('Failed to load tags:', error);
      // Don't set error for tags as it's not critical
    }
  }, []);

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
    // 関数を直接useEffect内部で呼び出して依存関係の問題を回避
    const initializeData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const tasks = await taskAPI.loadTasks();
        dispatch({ type: 'SET_TASKS', payload: tasks });
        
        const tags = await window.taskAPI.getAllTags();
        dispatch({ type: 'SET_TAGS', payload: tags });
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
    
    // WorkSpace切り替え時の自動更新を監視（ローディング表示なし）
    const handleWorkspaceChange = async () => {
      try {
        // ワークスペース切り替え時はローディング表示せずにサイレント更新
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
  }, []); // 依存配列を空にして初回のみ実行

  const contextValue: TaskContextType = {
    ...state,
    loadTasks,
    createTask,
    createTaskAfter,
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