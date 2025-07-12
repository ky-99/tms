import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTaskContext } from './TaskContext';
import { Task } from '../types/task';

interface ShortcutContextValue {
  // 現在のコンテキスト（例：global, taskSelected）
  currentContext: string;
  hoveredTask: Task | null;
  setCurrentContext: (context: string) => void;
  setHoveredTask: (task: Task | null) => void;
  clearSelection: () => void;
}

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined);

export const useShortcut = () => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcut must be used within a ShortcutProvider');
  }
  return context;
};

interface ShortcutProviderProps {
  children: ReactNode;
}

export const ShortcutProvider: React.FC<ShortcutProviderProps> = ({ children }) => {
  const [currentContext, setCurrentContext] = React.useState<string>('global');
  const [hoveredTask, setHoveredTask] = React.useState<Task | null>(null);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { createTask, createTaskAfter, updateTask, deleteTask, tasks } = useTaskContext();

  // 選択状態をクリアする関数
  const clearSelection = () => {
    setHoveredTask(null);
    setCurrentContext('global');
    setIsDuplicating(false); // 複製状態もリセット
  };

  // 最新のタスクデータを取得する関数
  const getCurrentTaskData = (taskId: number): Task | null => {
    const findTask = (taskList: Task[]): Task | null => {
      for (const task of taskList) {
        if (task.id === taskId) return task;
        if (task.children) {
          const found = findTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findTask(tasks);
  };

  // hoveredTaskを最新のデータで同期（無限ループを防ぐため最適化）
  useEffect(() => {
    if (hoveredTask) {
      const currentTaskData = getCurrentTaskData(hoveredTask.id);
      // より厳密な比較を行い、実際に変更があった場合のみ更新
      if (currentTaskData && 
          (currentTaskData.isRoutine !== hoveredTask.isRoutine ||
           currentTaskData.status !== hoveredTask.status ||
           currentTaskData.title !== hoveredTask.title)) {
        setHoveredTask(currentTaskData);
      }
    }
  }, [tasks, hoveredTask?.id]); // より具体的な依存配列

  // グローバルクリックイベントリスナー（選択状態をクリア）
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // タスクアイテムやタスクカードをクリックした場合はクリアしない
      if (target.closest('.task-item') || target.closest('.task-card')) {
        return;
      }
      
      // モーダルやメニューをクリックした場合もクリアしない
      if (target.closest('.modal') || target.closest('.context-menu') || target.closest('.task-detail-modal')) {
        return;
      }
      
      // それ以外の場合は選択状態をクリア
      clearSelection();
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // キーボードショートカットのハンドラー
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCmd = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      
      // モーダルが開いている場合のESCキー処理
      if (key === 'escape' && currentContext === 'modalOpen') {
        // モーダルを閉じる処理（各コンポーネントで実装）
        return;
      }

      // ESCキーで選択状態をクリア
      if (key === 'escape' && hoveredTask) {
        event.preventDefault();
        clearSelection();
        return;
      }

      // フィルター・ソート関連のショートカット（優先処理）
      // cmd + shift + f: フィルターモーダルを開く
      if (isCmd && event.shiftKey && key === 'f') {
        event.preventDefault();
        handleOpenFilterModal();
        return;
      }

      // cmd + shift + s: ソートモーダルを開く
      if (isCmd && event.shiftKey && key === 's') {
        event.preventDefault();
        handleOpenSortModal();
        return;
      }

      // グローバルショートカット
      if (currentContext === 'global' || currentContext === 'taskSelected' || currentContext === 'tasksPage') {
        // cmd + n: 新しいタスクを作成
        if (isCmd && key === 'n' && !event.shiftKey) {
          event.preventDefault();
          handleCreateTask();
          return;
        }

        // cmd + f: 検索フォーカス (shift が押されていない場合のみ)
        if (isCmd && key === 'f' && !event.shiftKey) {
          event.preventDefault();
          focusSearch();
          return;
        }

        // cmd + shift + m: 統合モーダルを開く
        if (isCmd && event.shiftKey && key === 'm') {
          event.preventDefault();
          handleOpenMergeModal();
          return;
        }
      }

      // ページナビゲーション（全てのコンテキストで有効）
      if (isCmd && ['1', '2', '3', '4'].includes(key)) {
        event.preventDefault();
        const pages = ['/', '/tasks', '/analyze', '/export'];
        navigate(pages[parseInt(key) - 1]);
        return;
      }

      // パスナビゲーション（tasksPageで有効）
      if (currentContext === 'tasksPage') {
        // cmd + u: 親タスクに移動
        if (isCmd && key === 'u') {
          event.preventDefault();
          handleNavigateToParent();
          return;
        }
      }

      // タスクがホバーされている場合のショートカット（モーダル開いている場合は無効）
      if (hoveredTask && currentContext !== 'modalOpen') {
        // cmd + shift + n: サブタスクを作成
        if (isCmd && event.shiftKey && key === 'n') {
          event.preventDefault();
          handleCreateSubTask(hoveredTask);
          return;
        }

        // cmd + e: タスクを編集
        if (isCmd && key === 'e') {
          event.preventDefault();
          handleEditTask(hoveredTask);
          return;
        }

        // cmd + d: タスクを複製
        if (isCmd && key === 'd') {
          event.preventDefault();
          
          if (!hoveredTask) {
            return;
          }
          
          // 子タスクの詳細画面（leaf node）でのみ複製を禁止
          // hoveredTaskが子を持たない場合のみ禁止
          const taskMatch = location.pathname.match(/^\/tasks\/(\d+)$/);
          if (taskMatch) {
            const currentTaskId = parseInt(taskMatch[1]);
            if (hoveredTask.id === currentTaskId && (!hoveredTask.children || hoveredTask.children.length === 0)) {
              return;
            }
          }
          
          handleDuplicateTask(hoveredTask);
          return;
        }

        // Delete: タスクを削除
        if (key === 'delete' || key === 'backspace') {
          event.preventDefault();
          handleDeleteTask(hoveredTask);
          return;
        }

        // cmd + enter: タスクのステータスを切り替え
        if (isCmd && key === 'enter') {
          event.preventDefault();
          handleToggleTaskStatus(hoveredTask);
          return;
        }

        // cmd + shift + r: ルーティンタスクを切り替え
        if (isCmd && event.shiftKey && key === 'r') {
          event.preventDefault();
          handleToggleRoutineTask(hoveredTask);
          return;
        }

        // space: タスクの進行度を循環 (入力フィールドでない場合のみ)
        if (key === ' ' && !(event.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) {
          event.preventDefault();
          handleCycleTaskStatus(hoveredTask);
          return;
        }

        // enter: タスクの展開/折りたたみ (入力フィールドでない場合のみ)
        if (key === 'enter' && !(event.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) {
          event.preventDefault();
          handleToggleTaskExpansion(hoveredTask);
          return;
        }

        // t: タスクステータスの切り替え (cmd+enterの代替、入力フィールドでない場合のみ)
        if (key === 't' && !(event.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) {
          event.preventDefault();
          handleToggleTaskStatus(hoveredTask);
          return;
        }
      }

      // 編集モードでのショートカット
      if (currentContext === 'editing') {
        // cmd + s: 変更を保存 (shift が押されていない場合のみ)
        if (isCmd && key === 's' && !event.shiftKey) {
          event.preventDefault();
          handleSaveChanges();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentContext, hoveredTask, navigate]); // TaskContext関数依存を削除して無限ループを防ぐ

  // ショートカットハンドラー関数
  const handleCreateTask = () => {
    // タスク作成モーダルを開くイベントを発行
    const event = new CustomEvent('openTaskCreateModal');
    window.dispatchEvent(event);
  };

  const handleCreateSubTask = (parentTask: Task) => {
    // サブタスク作成モーダルを開くイベントを発行
    const event = new CustomEvent('openTaskCreateModal', { detail: { parentId: parentTask.id } });
    window.dispatchEvent(event);
  };

  const handleEditTask = (task: Task) => {
    // タスク編集モーダルを開く処理
    // 実装はTaskDetailModalで行う
    const event = new CustomEvent('openTaskEditModal', { detail: { task } });
    window.dispatchEvent(event);
  };

  const handleDuplicateTask = async (task: Task) => {
    // 複製中の場合は複製を禁止
    if (isDuplicating) {
      return;
    }
    
    const duplicatedTask: Partial<Task> = {
      title: `${task.title} (コピー)`,
      description: task.description,
      status: 'pending',
      priority: task.priority,
      dueDate: task.dueDate,
      parentId: task.parentId,
    };
    
    try {
      setIsDuplicating(true);
      await createTaskAfter(duplicatedTask, task.id);
      // Toast notification would be handled by the component that receives the task
    } catch (error) {
      console.error('Failed to duplicate task:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`タスク「${task.title}」を削除してもよろしいですか？`)) {
      // Check if we're deleting the current task in detail view
      // For Electron apps, we need to check the hash portion of the URL
      const currentHash = window.location.hash;
      const currentTaskId = currentHash.match(/#\/tasks\/(\d+)/)?.[1];
      const isCurrentTask = currentTaskId && parseInt(currentTaskId) === task.id;
      
      // Navigate immediately if it's the current task
      if (isCurrentTask) {
        if (task.parentId) {
          navigate(`/tasks/${task.parentId}`);
        } else {
          navigate('/tasks');
        }
      }
      
      // Delete task immediately without delay
      deleteTask(task.id);
      
      // Toast notification would be handled by the component that receives the deletion
      setHoveredTask(null);
    }
  };

  const handleToggleTaskStatus = (task: Task) => {
    // 親タスクの場合はステータス変更を禁止
    if (task.children && task.children.length > 0) {
      return; // 親タスクは子タスクから自動計算されるため手動変更不可
    }
    
    const nextStatus = task.status === 'pending' ? 'completed' : 'pending';
    updateTask(task.id, { 
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    // Toast notification would be handled by the component that receives the status change
  };

  const handleCycleTaskStatus = (task: Task) => {
    // 親タスクの場合はステータス変更を禁止
    if (task.children && task.children.length > 0) {
      return; // 親タスクは子タスクから自動計算されるため手動変更不可
    }
    
    // pending -> in_progress -> completed -> pending の順で循環
    let nextStatus: 'pending' | 'in_progress' | 'completed';
    
    switch (task.status) {
      case 'pending':
        nextStatus = 'in_progress';
        break;
      case 'in_progress':
        nextStatus = 'completed';
        break;
      case 'completed':
        nextStatus = 'pending';
        break;
      default:
        nextStatus = 'pending';
    }
    
    updateTask(task.id, { 
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const focusSearch = () => {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="検索"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleOpenFilterModal = () => {
    const event = new CustomEvent('openFilterModal');
    window.dispatchEvent(event);
  };

  const handleOpenSortModal = () => {
    const event = new CustomEvent('openSortModal');
    window.dispatchEvent(event);
  };

  const handleSaveChanges = () => {
    const event = new CustomEvent('saveChanges');
    window.dispatchEvent(event);
  };

  const handleToggleRoutineTask = (task: Task) => {
    // 最新のタスクデータを取得
    const currentTaskData = getCurrentTaskData(task.id);
    if (currentTaskData) {
      const event = new CustomEvent('toggleRoutineTask', { detail: { task: currentTaskData } });
      window.dispatchEvent(event);
    } else {
      const event = new CustomEvent('toggleRoutineTask', { detail: { task } });
      window.dispatchEvent(event);
    }
  };

  const handleOpenMergeModal = () => {
    const event = new CustomEvent('openMergeModal');
    window.dispatchEvent(event);
  };

  const handleNavigateToParent = () => {
    const event = new CustomEvent('navigateToParent');
    window.dispatchEvent(event);
  };

  const handleToggleTaskExpansion = (task: Task) => {
    const event = new CustomEvent('toggleTaskExpansion', { detail: { task } });
    window.dispatchEvent(event);
  };

  // ページが変わったときに状態をリセット
  React.useEffect(() => {
    setCurrentContext('global');
    setIsDuplicating(false); // ページ変更時に複製状態もリセット
  }, [location.pathname]);

  const setCurrentContextWithLog = (context: string) => {
    setCurrentContext(context);
  };

  const value: ShortcutContextValue = {
    currentContext,
    hoveredTask,
    setCurrentContext: setCurrentContextWithLog,
    setHoveredTask,
    clearSelection,
  };

  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
};