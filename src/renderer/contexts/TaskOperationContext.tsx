import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useTaskContext } from './TaskContext';
import { useGlobalAlert } from '../hooks';
import { Task } from '../types/task';
import { findTaskById } from '../utils/taskUtils';

interface TaskOperationContextValue {
  isDuplicating: boolean;
  createTask: () => void;
  createSubTask: (parentTask: Task) => void;
  editTask: (task: Task) => void;
  duplicateTask: (task: Task) => Promise<void>;
  deleteTask: (task: Task) => void;
  toggleTaskStatus: (task: Task) => void;
  cycleTaskStatus: (task: Task) => void;
  toggleRoutineTask: (task: Task) => void;
  toggleTaskExpansion: (task: Task) => void;
}

const TaskOperationContext = createContext<TaskOperationContextValue | undefined>(undefined);

export const useTaskOperation = () => {
  const context = useContext(TaskOperationContext);
  if (!context) {
    throw new Error('useTaskOperation must be used within a TaskOperationProvider');
  }
  return context;
};

interface TaskOperationProviderProps {
  children: ReactNode;
}

export const TaskOperationProvider: React.FC<TaskOperationProviderProps> = ({ children }) => {
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [location, setLocation] = useLocation();
  const { showAlert } = useGlobalAlert();
  const { createTask: contextCreateTask, createTaskAfter, updateTask, deleteTask: contextDeleteTask, tasks } = useTaskContext();

  const createTask = useCallback(() => {
    // タスク作成前にスクロール位置を保存するカスタムイベントを発行
    window.dispatchEvent(new CustomEvent('taskUpdateStart'));
    
    // カスタムイベントを発行してモーダルを開く
    window.dispatchEvent(new CustomEvent('openCreateModal'));
  }, []);

  const createSubTask = useCallback((parentTask: Task) => {
    // カスタムイベントを発行してサブタスクモーダルを開く
    window.dispatchEvent(new CustomEvent('openCreateModalWithParent', { 
      detail: { parentTask } 
    }));
  }, []);

  const editTask = useCallback((task: Task) => {
    // カスタムイベントを発行して編集モーダルを開く
    window.dispatchEvent(new CustomEvent('openTaskEditModal', { 
      detail: { task } 
    }));
  }, []);

  const duplicateTask = useCallback(async (task: Task) => {
    if (isDuplicating) return;
    
    setIsDuplicating(true);
    try {
      // タスクを複製する
      const duplicatedTask = {
        ...task,
        title: `${task.title} (コピー)`,
        status: 'pending' as const,
        id: undefined // 新しいIDを生成するため
      };
      
      await contextCreateTask(duplicatedTask);
      showAlert('タスクを複製しました', { type: 'success' });
    } catch (error) {
      console.error('タスクの複製中にエラーが発生しました:', error);
      showAlert('タスクの複製に失敗しました', { type: 'error' });
    } finally {
      setIsDuplicating(false);
    }
  }, [isDuplicating, contextCreateTask, showAlert]);

  const deleteTask = useCallback((task: Task) => {
    if (!task) return;
    
    // 削除確認ダイアログを表示
    showAlert('タスクを削除しますか？', {
      type: 'warning',
      showCancel: true,
      confirmText: '削除',
      cancelText: 'キャンセル',
      onConfirm: async () => {
          try {
            await contextDeleteTask(task.id);
            showAlert('タスクを削除しました', { type: 'success' });
            
            // 削除されたタスクがタスク詳細ページで表示されている場合、親ページに戻る
            const currentPath = location;
            if (currentPath === `/tasks/${task.id}`) {
              if (task.parentId) {
                setLocation(`/tasks/${task.parentId}`);
              } else {
                setLocation('/tasks');
              }
            }
          } catch (error) {
            console.error('タスクの削除中にエラーが発生しました:', error);
            showAlert('タスクの削除に失敗しました', { type: 'error' });
          }
      }
    });
  }, [contextDeleteTask, showAlert, location, setLocation]);

  const toggleTaskStatus = useCallback((task: Task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    updateTask(task.id, { status: newStatus });
    
    const statusText = newStatus === 'completed' ? '完了' : '未完了';
    showAlert(`タスクを${statusText}にしました`, { type: 'success' });
  }, [updateTask, showAlert]);

  const cycleTaskStatus = useCallback((task: Task) => {
    let newStatus: Task['status'];
    
    switch (task.status) {
      case 'pending':
        newStatus = 'in_progress';
        break;
      case 'in_progress':
        newStatus = 'completed';
        break;
      case 'completed':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'pending';
    }
    
    updateTask(task.id, { status: newStatus });
    
    const statusMap = {
      pending: '未完了',
      in_progress: '進行中',
      completed: '完了'
    };
    showAlert(`タスクを${statusMap[newStatus]}にしました`, { type: 'success' });
  }, [updateTask, showAlert]);

  const toggleRoutineTask = useCallback((task: Task) => {
    const newRoutineStatus = !task.isRoutine;
    updateTask(task.id, { isRoutine: newRoutineStatus });
    
    const routineText = newRoutineStatus ? 'ルーティンタスクに設定' : 'ルーティンタスクを解除';
    showAlert(`${routineText}しました`, { type: 'success' });
  }, [updateTask, showAlert]);

  const toggleTaskExpansion = useCallback((task: Task) => {
    // タスクの展開状態をトグル（ローカルストレージで管理）
    const key = `task-expanded-${task.id}`;
    const isExpanded = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, (!isExpanded).toString());
    
    // UIの更新を促すためのカスタムイベントを発行
    window.dispatchEvent(new CustomEvent('taskExpansionToggled', { 
      detail: { taskId: task.id, isExpanded: !isExpanded } 
    }));
  }, []);

  const value: TaskOperationContextValue = {
    isDuplicating,
    createTask,
    createSubTask,
    editTask,
    duplicateTask,
    deleteTask,
    toggleTaskStatus,
    cycleTaskStatus,
    toggleRoutineTask,
    toggleTaskExpansion
  };

  return (
    <TaskOperationContext.Provider value={value}>
      {children}
    </TaskOperationContext.Provider>
  );
};