import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types';
import { useTaskContext } from '../contexts/TaskContext';
import { useShortcut } from '../contexts/ShortcutContext';
import StatusPriorityModal from './StatusPriorityModal';
import { isParentTask } from '../utils/taskUtils';

// 親タスク選択コンポーネント
interface ParentTaskSelectorProps {
  availableTasks: { id: number; title: string; depth: number }[];
  selectedParentId?: number;
  onParentSelect: (parentId?: number) => void;
}

const ParentTaskSelector: React.FC<ParentTaskSelectorProps> = ({ 
  availableTasks, 
  selectedParentId, 
  onParentSelect 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // 外側をクリックしたときに閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredTasks = availableTasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTask = availableTasks.find(task => task.id === selectedParentId);

  return (
    <div className="parent-task-selector" ref={selectorRef}>
      <div 
        className="parent-task-selector-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="parent-task-selector-value">
          {selectedTask ? selectedTask.title : 'なし（ルートタスク）'}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="parent-task-selector-arrow">
          <path d={isOpen ? "M7 14l5-5 5 5z" : "M7 10l5 5 5-5z"}/>
        </svg>
      </div>
      
      {isOpen && (
        <div className="parent-task-selector-dropdown">
          <div className="parent-task-selector-search">
            <input
              type="text"
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="parent-task-selector-search-input"
              autoFocus
            />
          </div>
          
          <div className="parent-task-selector-options">
            <div
              className={`parent-task-selector-option ${!selectedParentId ? 'selected' : ''}`}
              onClick={() => {
                onParentSelect(undefined);
                setIsOpen(false);
                setSearchQuery('');
              }}
              onMouseEnter={() => setHoveredId(null)}
            >
              なし（ルートタスク）
            </div>
            
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`parent-task-selector-option ${
                  task.id === selectedParentId ? 'selected' : ''
                } ${task.id === hoveredId ? 'hovered' : ''}`}
                style={{ paddingLeft: `${16 + task.depth * 20}px` }}
                onClick={() => {
                  onParentSelect(task.id);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                onMouseEnter={() => setHoveredId(task.id)}
              >
                {task.title}
              </div>
            ))}
            
            {filteredTasks.length === 0 && searchQuery && (
              <div className="parent-task-selector-no-results">
                該当するタスクがありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskDetailModalProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  allTasks?: Task[];
  defaultParentId?: number;
  isCreating?: boolean;
  onStatusChange?: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  task: initialTask, 
  isOpen, 
  onClose, 
  allTasks = [], 
  defaultParentId,
  isCreating = false,
  onStatusChange
}) => {
  const navigate = useNavigate();
  const { updateTask, createTask, tasks } = useTaskContext();
  const { setCurrentContext, clearSelection } = useShortcut();
  
  // 楽観的更新用
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null);
  const [optimisticDueDate, setOptimisticDueDate] = useState<string | null>(null);

  // TaskContextから最新のタスクを取得（新規作成時は新しいタスクオブジェクトを作成）
  const task = React.useMemo(() => {
    if (isCreating || !initialTask) {
      // 新規作成時は初期値を持つタスクオブジェクトを作成
      return {
        id: -1, // 仮のID
        title: '',
        description: '',
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
        parentId: defaultParentId || undefined,
        dueDate: undefined,
        completedAt: undefined,
        isRoutine: false,
        tags: [],
        children: []
      };
    }
    
    const findTask = (taskList: Task[]): Task | null => {
      for (const currentTask of taskList) {
        if (currentTask.id === initialTask.id) {
          return currentTask;
        }
        if (currentTask.children && currentTask.children.length > 0) {
          const found = findTask(currentTask.children);
          if (found) return found;
        }
      }
      return null;
    };
    const foundTask = findTask(tasks);
    if (foundTask) {
      return foundTask;
    }
    // tasksが空の場合やタスクが見つからない場合は、initialTaskを使用
    return initialTask;
  }, [tasks, initialTask, isCreating, defaultParentId]);
  
  // 編集状態の管理（新規作成時は自動的に編集モード）
  const [isEditingTitle, setIsEditingTitle] = useState(isCreating);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(isCreating);
  
  // IME状態の管理
  const [isComposing, setIsComposing] = useState(false);
  
  // 編集値の管理
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedDueDate, setEditedDueDate] = useState(() => {
    if (isCreating) return '';
    const dueDate = initialTask?.dueDate || (initialTask as any)?.due_date;
    if (dueDate) {
      const date = new Date(dueDate);
      return date.toISOString().split('T')[0];
    }
    return '';
  });
  const [editedParentId, setEditedParentId] = useState<number | undefined>(task.parentId);
  const [editedStatus, setEditedStatus] = useState(task.status);
  const [editedPriority, setEditedPriority] = useState(task.priority);
  const [editedIsRoutine, setEditedIsRoutine] = useState(task.isRoutine || false);
  
  // モーダル位置とリファレンス
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  // taskが更新された時に編集値を同期
  React.useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(task.title);
    }
    // 説明フィールドの同期は楽観的更新が無い場合のみ実行
    if (!isEditingDescription && optimisticDescription === null) {
      setEditedDescription(task.description || '');
    }
    if (!isEditingDueDate && !isCreating) {
      const dueDate = task.dueDate || (task as any).due_date;
      if (dueDate) {
        const date = new Date(dueDate);
        setEditedDueDate(date.toISOString().split('T')[0]);
      } else {
        setEditedDueDate('');
      }
    }
  }, [task, isEditingTitle, isEditingDescription, isEditingDueDate, optimisticDescription]);

  // モーダルのオープン/クローズ時の処理
  React.useEffect(() => {
    if (isOpen) {
      // モーダルが開いたときは選択状態を解除し、modalOpenコンテキストに設定
      clearSelection();
      setCurrentContext('modalOpen');
    } else {
      // モーダルが閉じたときはグローバルコンテキストに戻す
      setCurrentContext('global');
    }
  }, [isOpen, clearSelection, setCurrentContext]);

  // モーダルが開いたときに新規作成モードの場合は編集状態をリセット
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (isOpen && isCreating && !isInitialized) {
      setIsEditingTitle(true);
      setIsEditingDescription(true);
      setEditedTitle('');
      setEditedDescription('');
      setEditedDueDate('');
      setEditedParentId(defaultParentId);
      setEditedStatus('pending');
      setEditedPriority('medium');
      setEditedIsRoutine(false);
      setOptimisticTitle(null);
      setOptimisticDescription(null);
      setOptimisticDueDate(null);
      setIsInitialized(true);
      
      // タイトル入力欄にフォーカスを設定
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 100);
    } else if (!isOpen) {
      // モーダルが閉じられた時に初期化フラグをリセット
      setIsInitialized(false);
    }
  }, [isOpen, isCreating, defaultParentId, isInitialized]);

  // タイトル編集ハンドラー
  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setEditedTitle(optimisticTitle || task.title);
  };

  const handleTitleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    
    // 文字数制限チェック（日本語文字も考慮して25文字）
    if (trimmedTitle.length > 25) {
      alert('タイトルは25文字以内で入力してください');
      setEditedTitle(trimmedTitle.substring(0, 25));
      return;
    }
    
    if (!trimmedTitle) {
      if (isCreating) {
        return;
      }
      setIsEditingTitle(false);
      return;
    }
    
    if (isCreating) {
      // 新規作成時：まだタスクが作成されていない場合のみ作成
      // 既に説明保存時に作成済みの場合はタイトルのみ更新
      if (task.id === -1) {
        // まだタスクが作成されていない場合
        try {
          setOptimisticTitle(trimmedTitle);
          setIsEditingTitle(false);
          
          const newTask = await createTask({
            title: trimmedTitle,
            description: editedDescription,
            status: editedStatus,
            priority: editedPriority,
            parentId: editedParentId,
            dueDate: editedDueDate ? new Date(editedDueDate).toISOString() : undefined,
            isRoutine: editedIsRoutine
          });
          
          // 作成成功時はモーダルを閉じる
          onClose();
        } catch (error) {
          console.error('Failed to create task:', error);
          setOptimisticTitle(null);
          setIsEditingTitle(true);
        }
      } else {
        // 既にタスクが作成済みの場合はタイトルのみ更新
        setOptimisticTitle(trimmedTitle);
        setIsEditingTitle(false);
      }
    } else if (trimmedTitle !== task.title) {
      try {
        setOptimisticTitle(trimmedTitle);
        setIsEditingTitle(false);
        await updateTask(task.id, { title: trimmedTitle });
        setOptimisticTitle(null);
      } catch (error) {
        console.error('Failed to update task title:', error);
        setOptimisticTitle(null);
        setEditedTitle(task.title);
        setIsEditingTitle(true);
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };

  // 説明編集ハンドラー
  const handleDescriptionEdit = () => {
    setIsEditingDescription(true);
    // 楽観的更新が有効な場合はそれを使用、そうでなければタスクのdescriptionを使用
    setEditedDescription(optimisticDescription !== null ? optimisticDescription : (task.description || ''));
  };

  const handleDescriptionSave = async () => {
    if (isCreating) {
      // 新規作成時はタスクを作成（タイトルが入力されている場合のみ）
      const trimmedTitle = editedTitle.trim();
      if (trimmedTitle && trimmedTitle.length <= 25) {
        try {
          setOptimisticDescription(editedDescription);
          setIsEditingDescription(false);
          
          const newTask = await createTask({
            title: trimmedTitle,
            description: editedDescription,
            status: editedStatus,
            priority: editedPriority,
            parentId: editedParentId,
            dueDate: editedDueDate ? new Date(editedDueDate).toISOString() : undefined,
            isRoutine: editedIsRoutine
          });
          
          // 作成成功時はモーダルを閉じる
          onClose();
        } catch (error) {
          console.error('Failed to create task:', error);
          setOptimisticDescription(null);
          setIsEditingDescription(true);
        }
      } else {
        // タイトルが無効な場合は説明のみ楽観的更新（日付は保持）
        setOptimisticDescription(editedDescription);
        setIsEditingDescription(false);
        // 日付情報は editedDueDate として保持されているので何もしない
      }
      return;
    }
    
    if (editedDescription !== (task.description || '')) {
      try {
        // 楽観的更新を即座に設定
        setOptimisticDescription(editedDescription);
        setIsEditingDescription(false);
        
        // 空文字列の場合は明示的に空文字列を送信
        const updateData = { description: editedDescription };
        await updateTask(task.id, updateData);
        
        // 成功時は楽観的更新を解除
        setOptimisticDescription(null);
        
        // タスクの再読み込みを強制（必要に応じて）
        // これにより最新の状態がTaskContextから確実に反映される
      } catch (error) {
        console.error('Failed to update task description:', error);
        // エラー時は楽観的更新を解除し、元の値に戻す
        setOptimisticDescription(null);
        setEditedDescription(task.description || '');
        setIsEditingDescription(true);
      }
    } else {
      setIsEditingDescription(false);
    }
  };

  const handleDescriptionCancel = () => {
    // 楽観的更新が有効な場合はそれを使用、そうでなければタスクのdescriptionを使用
    setEditedDescription(optimisticDescription !== null ? optimisticDescription : (task.description || ''));
    setIsEditingDescription(false);
  };


  // 期限日編集ハンドラー
  const handleDueDateEdit = () => {
    setIsEditingDueDate(true);
  };

  const handleDueDateSave = async () => {
    if (isCreating) {
      setIsEditingDueDate(false);
      return;
    }
    
    const currentDueDate = task.dueDate || (task as any).due_date;
    const currentDateString = currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : '';
    
    if (editedDueDate !== currentDateString) {
      try {
        const newDueDate = editedDueDate ? new Date(editedDueDate).toISOString() : undefined;
        setOptimisticDueDate(editedDueDate);
        setIsEditingDueDate(false);
        await updateTask(task.id, { dueDate: newDueDate });
        setOptimisticDueDate(null);
      } catch (error) {
        console.error('Failed to update task due date:', error);
        setOptimisticDueDate(null);
        setIsEditingDueDate(true);
      }
    } else {
      setIsEditingDueDate(false);
    }
  };

  const handleDueDateCancel = () => {
    const dueDate = task.dueDate || (task as any).due_date;
    setEditedDueDate(dueDate ? new Date(dueDate).toISOString().split('T')[0] : '');
    setIsEditingDueDate(false);
  };

  // ステータス編集ハンドラー
  const handleStatusClick = () => {
    // 親タスクの場合はステータス編集を無効にする（新規作成時は除く）
    if (!isCreating && isParentTask(task)) {
      return;
    }
    
    if (statusRef.current) {
      const rect = statusRef.current.getBoundingClientRect();
      setModalPosition({
        x: rect.left,
        y: rect.bottom + 4
      });
    }
    setIsEditingStatus(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsEditingStatus(false);
    
    if (isCreating) {
      // 新規作成時はステートを更新するだけ
      setEditedStatus(newStatus as 'pending' | 'in_progress' | 'completed');
      return;
    }
    
    if (newStatus !== task.status) {
      try {
        // ステータス変更の開始を親コンポーネントに通知
        if (onStatusChange) {
          onStatusChange();
        }
        
        await updateTask(task.id, { status: newStatus as 'pending' | 'in_progress' | 'completed' });
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }
  };

  // 優先度編集ハンドラー
  const handlePriorityClick = () => {
    if (priorityRef.current) {
      const rect = priorityRef.current.getBoundingClientRect();
      setModalPosition({
        x: rect.left,
        y: rect.bottom + 4
      });
    }
    setIsEditingPriority(true);
  };

  const handlePriorityChange = async (newPriority: string) => {
    setIsEditingPriority(false);
    
    if (isCreating) {
      // 新規作成時はステートを更新するだけ
      setEditedPriority(newPriority as 'low' | 'medium' | 'high' | 'urgent');
      return;
    }
    
    if (newPriority !== task.priority) {
      try {
        await updateTask(task.id, { priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' });
      } catch (error) {
        console.error('Failed to update task priority:', error);
      }
    }
  };
  // モーダル表示時のスクロール無効化（背景のみ）
  React.useEffect(() => {
    if (isOpen) {
      // 現在のスクロール位置を保存
      const scrollY = window.scrollY;
      
      // htmlとbodyの背景スクロールのみを無効化
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // キーボードによるスクロールを無効化（モーダル外の場合のみ）
      const preventScroll = (e: KeyboardEvent) => {
        const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
        if (scrollKeys.includes(e.code)) {
          // モーダル内のスクロール可能要素内でのキーボード操作は許可
          const target = e.target as HTMLElement;
          const isInModal = target.closest('.task-detail-modal');
          if (!isInModal) {
            e.preventDefault();
          }
        }
      };
      
      // ホイールスクロールを無効化（モーダル外の場合のみ）
      const preventWheel = (e: WheelEvent) => {
        // モーダル内のスクロール可能要素内でのホイール操作は許可
        const target = e.target as HTMLElement;
        const isInModal = target.closest('.task-detail-modal');
        if (!isInModal) {
          e.preventDefault();
        }
      };
      
      // タッチスクロールを無効化（モーダル外の場合のみ）
      const preventTouch = (e: TouchEvent) => {
        if (e.touches.length > 1) return; // マルチタッチは許可
        // モーダル内のスクロール可能要素内でのタッチ操作は許可
        const target = e.target as HTMLElement;
        const isInModal = target.closest('.task-detail-modal');
        if (!isInModal) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('keydown', preventScroll, { passive: false });
      document.addEventListener('wheel', preventWheel, { passive: false });
      document.addEventListener('touchmove', preventTouch, { passive: false });
      
      return () => {
        // クリーンアップ時にスクロールを復元
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
        
        // イベントリスナーを削除
        document.removeEventListener('keydown', preventScroll);
        document.removeEventListener('wheel', preventWheel);
        document.removeEventListener('touchmove', preventTouch);
      };
    }
  }, [isOpen]);

  // ESCキーでモーダルを閉じる
  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      'pending': '未着手',
      'in_progress': '進行中',
      'completed': '完了',
      'cancelled': 'キャンセル'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '緊急'
    };
    return priorityMap[priority as keyof typeof priorityMap] || priority;
  };

  // タスクパス（親タスクの階層）を取得
  const getTaskPath = (): Task[] => {
    if (!allTasks.length) return [];
    
    const path: Task[] = [];
    
    const findTaskPath = (taskList: Task[], targetId: number, currentPath: Task[]): boolean => {
      for (const currentTask of taskList) {
        const newPath = [...currentPath, currentTask];
        
        if (currentTask.id === targetId) {
          path.push(...newPath);
          return true;
        }
        
        if (currentTask.children && findTaskPath(currentTask.children, targetId, newPath)) {
          return true;
        }
      }
      return false;
    };
    
    findTaskPath(allTasks, task.id, []);
    // 自分自身も含めて返す
    return path;
  };

  // 親タスクとして選択可能なタスクのリストを取得
  const getAvailableParentTasks = (): { id: number; title: string; depth: number }[] => {
    const availableTasks: { id: number; title: string; depth: number }[] = [];
    
    const addTasksRecursively = (taskList: Task[], depth: number = 0) => {
      for (const currentTask of taskList) {
        // 新規作成時は全てのタスクが選択可能
        if (isCreating || currentTask.id !== task.id) {
          availableTasks.push({
            id: currentTask.id,
            title: currentTask.title,
            depth
          });
        }
        
        if (currentTask.children && currentTask.children.length > 0) {
          // 編集時は自分の子孫タスクは選択不可
          if (isCreating || !isDescendantOf(task.id, currentTask.id)) {
            addTasksRecursively(currentTask.children, depth + 1);
          }
        }
      }
    };
    
    addTasksRecursively(allTasks);
    return availableTasks;
  };

  // あるタスクが別のタスクの子孫かどうかをチェック
  const isDescendantOf = (taskId: number, ancestorId: number): boolean => {
    const findDescendant = (taskList: Task[]): boolean => {
      for (const currentTask of taskList) {
        if (currentTask.id === taskId) return true;
        if (currentTask.children && findDescendant(currentTask.children)) {
          return true;
        }
      }
      return false;
    };
    
    const ancestor = findTaskInTree(allTasks, ancestorId);
    return ancestor ? findDescendant(ancestor.children || []) : false;
  };

  // タスクツリーから特定のタスクを探す
  const findTaskInTree = (taskList: Task[], targetId: number): Task | null => {
    for (const currentTask of taskList) {
      if (currentTask.id === targetId) return currentTask;
      if (currentTask.children) {
        const found = findTaskInTree(currentTask.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const taskPath = getTaskPath();

  const [isClosing, setIsClosing] = useState(false);

  // モーダルが開かれた時にisClosingをリセット
  React.useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handlePathClick = (pathTask: Task) => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      navigate(`/tasks/${pathTask.id}`);
    }, 200); // アニメーション時間に合わせる
  };

  const handleViewInTaskManager = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      navigate(`/tasks/${task.id}`);
    }, 200); // アニメーション時間に合わせる
  };

  if (!isOpen) return null;

  return (
    <div className={`task-detail-modal-backdrop ${isClosing ? 'fade-out' : ''}`} onClick={handleBackdropClick}>
      <div className={`task-detail-modal ${isClosing ? 'fade-out' : ''}`}>
        <div className="task-detail-modal-header">
          <div className="task-detail-header-content">
            {!isCreating && taskPath.length > 0 && (
              <nav className="task-detail-breadcrumb">
                <button
                  onClick={() => navigate('/tasks')}
                  className="breadcrumb-link"
                >
                  ホーム
                </button>
                {taskPath.map((pathTask, index) => (
                  <React.Fragment key={pathTask.id}>
                    <span className="breadcrumb-separator">/</span>
                    <button
                      onClick={() => handlePathClick(pathTask)}
                      className={index === taskPath.length - 1 ? "breadcrumb-current" : "breadcrumb-link"}
                    >
                      {pathTask.title}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
            <div className="task-detail-title-container">
              {isEditingTitle ? (
                <textarea
                  value={editedTitle}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // 改行を削除
                    const valueWithoutNewline = newValue.replace(/\n/g, '');
                    // 文字数制限のリアルタイムチェック
                    if (valueWithoutNewline.length <= 25) {
                      setEditedTitle(valueWithoutNewline);
                    }
                  }}
                  onBlur={isCreating ? undefined : handleTitleSave}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    // IME変換中は処理しない
                    if (e.nativeEvent.isComposing || isComposing) {
                      return;
                    }
                    
                    // 新規作成時は改行を防ぐ
                    if (isCreating && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      return;
                    }
                    
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleTitleSave();
                    } else if (e.key === 'Escape') {
                      handleTitleCancel();
                    }
                  }}
                  className="task-detail-title-input"
                  rows={1}
                  maxLength={25}
                  placeholder={isCreating ? "タスクのタイトルを入力してください" : ""}
                  ref={titleInputRef}
                />
              ) : (
                <h2 className="task-detail-title" onClick={handleTitleEdit}>
                  {optimisticTitle || task.title}
                </h2>
              )}
            </div>
          </div>
        </div>
        
        <div className="task-detail-content">
          <div className="task-detail-badges">
            <span 
              ref={statusRef}
              className={`status ${isCreating ? editedStatus : task.status} ${!isCreating && isParentTask(task) ? 'parent-task-status' : ''}`}
              onClick={handleStatusClick}
              style={{ cursor: (!isCreating && isParentTask(task)) ? 'default' : 'pointer' }}
              title={(!isCreating && isParentTask(task)) ? '親タスクのステータスは子タスクから自動計算されます' : 'クリックしてステータスを変更'}
            >
              {getStatusText(isCreating ? editedStatus : task.status)}
            </span>
            <span 
              ref={priorityRef}
              className={`priority ${isCreating ? editedPriority : task.priority}`}
              onClick={handlePriorityClick}
              style={{ cursor: 'pointer' }}
              title="クリックして優先度を変更"
            >
              {getPriorityText(isCreating ? editedPriority : task.priority)}
            </span>
          </div>

          {isCreating && (
            <div className="task-detail-section task-detail-create-settings">
              <div className="task-detail-create-field">
                <label className="task-detail-create-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="task-detail-icon">
                    <path d="M3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V3h-2v2H8V3H6v2H5c-1.11 0-2 .9-2 2zm2 0h14v2H5V5zm0 4h14v10H5V9zm7 2v2h2v-2h-2zm0 4v2h2v-2h-2z"/>
                  </svg>
                  親タスク
                </label>
                <ParentTaskSelector
                  availableTasks={getAvailableParentTasks()}
                  selectedParentId={editedParentId}
                  onParentSelect={setEditedParentId}
                />
              </div>
              
              <div className="task-detail-create-field">
                <label className="task-detail-create-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="task-detail-icon">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                  期限日
                </label>
                <input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  className="task-detail-date-input"
                />
              </div>
              
              <div className="task-detail-create-field">
                <label className="task-detail-create-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="task-detail-icon">
                    <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
                  </svg>
                  タスクタイプ
                </label>
                <div className="task-detail-radio-group">
                  <label className="task-detail-radio-label">
                    <input
                      type="radio"
                      name="taskType"
                      value="normal"
                      checked={!editedIsRoutine}
                      onChange={() => setEditedIsRoutine(false)}
                      className="task-detail-radio"
                    />
                    <span className="task-detail-radio-text">通常タスク</span>
                  </label>
                  <label className="task-detail-radio-label">
                    <input
                      type="radio"
                      name="taskType"
                      value="routine"
                      checked={editedIsRoutine}
                      onChange={() => setEditedIsRoutine(true)}
                      className="task-detail-radio"
                    />
                    <span className="task-detail-radio-text">ルーティンタスク</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="task-detail-section">
            <h3>説明</h3>
            {isEditingDescription ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={isCreating ? undefined : handleDescriptionSave}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  // IME変換中は処理しない
                  if (e.nativeEvent.isComposing || isComposing) {
                    return;
                  }
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleDescriptionSave();
                  } else if (e.key === 'Escape') {
                    handleDescriptionCancel();
                  }
                  // 普通のEnterで改行（デフォルトの動作）
                }}
                className="task-detail-description-input"
                placeholder={isCreating ? "説明を入力してください" : "説明を入力してください（Ctrl/Cmd+Enterで保存）"}
              />
            ) : (
              <div 
                className="task-detail-description"
                onClick={handleDescriptionEdit}
                title="クリックして説明を編集"
              >
                {(() => {
                  // 楽観的更新が有効な場合はそれを使用
                  if (optimisticDescription !== null) {
                    return optimisticDescription || (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>
                        説明を追加するにはクリックしてください
                      </span>
                    );
                  }
                  // 通常の表示
                  return task.description || (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>
                      説明を追加するにはクリックしてください
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {!isCreating && (
            <div className="task-detail-section">
              <h3>詳細情報</h3>
            <div className="task-detail-info">
              <div className="task-detail-info-item">
                <label>期限日:</label>
                {isEditingDueDate ? (
                  <input
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => setEditedDueDate(e.target.value)}
                    onBlur={handleDueDateSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDueDateSave();
                      } else if (e.key === 'Escape') {
                        handleDueDateCancel();
                      }
                    }}
                    autoFocus
                    className="task-detail-date-input"
                  />
                ) : (
                  <span 
                    onClick={handleDueDateEdit}
                    style={{ cursor: 'pointer' }}
                    title="クリックして期限日を変更"
                  >
                    {formatDate(optimisticDueDate ? (optimisticDueDate ? new Date(optimisticDueDate).toISOString() : undefined) : (task.dueDate || (task as any).due_date))}
                  </span>
                )}
              </div>
              <div className="task-detail-info-item">
                <label>作成日:</label>
                <span>{formatDate(task.createdAt || (task as any).created_at)}</span>
              </div>
              {task.status === 'completed' && (task.completedAt || (task as any).completed_at) && (
                <div className="task-detail-info-item">
                  <label>完了日:</label>
                  <span>{formatDate(task.completedAt || (task as any).completed_at)}</span>
                </div>
              )}
              {(task.isRoutine || (task as any).is_routine) && (
                <div className="task-detail-info-item">
                  <label>タイプ:</label>
                  <span>ルーティンタスク</span>
                </div>
              )}
            </div>
            </div>
          )}

          {!isCreating && task.tags && task.tags.length > 0 && (
            <div className="task-detail-section">
              <h3>タグ</h3>
              <div className="task-detail-tags">
                {task.tags.map(tag => (
                  <span 
                    key={tag.id} 
                    className="task-detail-tag"
                    style={{
                      backgroundColor: tag.color,
                      color: tag.textColor || tag.text_color || '#ffffff'
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isCreating && task.children && task.children.length > 0 && (
            <div className="task-detail-section">
              <h3>子タスク ({task.children.length})</h3>
              <div className="task-detail-children">
                {task.children.map((child: any) => (
                  <div key={child.id} className="task-detail-child">
                    <span className={`child-status ${child.status}`}>
                      {getStatusText(child.status)}
                    </span>
                    <span className="child-title">{child.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isCreating && (
            <div className="task-detail-section">
              <div className="task-detail-actions">
                <button 
                  className="task-detail-save-btn"
                  onClick={handleTitleSave}
                  disabled={!editedTitle.trim()}
                >
                  タスクを作成
                </button>
                <button 
                  className="task-detail-cancel-btn"
                  onClick={onClose}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* ステータス編集モーダル */}
      {isEditingStatus && (
        <StatusPriorityModal
          type="status"
          currentValue={isCreating ? editedStatus : task.status}
          onSelect={handleStatusChange}
          onClose={() => setIsEditingStatus(false)}
          position={modalPosition}
        />
      )}
      
      {/* 優先度編集モーダル */}
      {isEditingPriority && (
        <StatusPriorityModal
          type="priority"
          currentValue={isCreating ? editedPriority : task.priority}
          onSelect={handlePriorityChange}
          onClose={() => setIsEditingPriority(false)}
          position={modalPosition}
        />
      )}
    </div>
  );
};

export default TaskDetailModal;