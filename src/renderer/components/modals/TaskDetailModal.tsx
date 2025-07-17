import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { Task } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks';
import ParentTaskSelector from '../forms/ParentTaskSelector';
import TaskDetailHeader from '../forms/TaskDetailHeader';
import TaskDetailDescription from '../forms/TaskDetailDescription';
import TaskDetailMetadata from '../forms/TaskDetailMetadata';
import TaskDetailSubtasks from '../forms/TaskDetailSubtasks';
import TaskDetailActions from '../forms/TaskDetailActions';
import { flattenTasks } from '../../utils/taskUtils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  isCreating?: boolean;
  defaultParentId?: number;
  defaultDueDate?: string;
  onStatusChange?: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  task: initialTask, 
  isCreating = false,
  defaultParentId,
  defaultDueDate,
  onStatusChange
}) => {
  const [, setLocation] = useLocation();
  const { 
    tasks, 
    createTask, 
    updateTask, 
    deleteTask
  } = useTaskContext();
  const { showAlert } = useGlobalAlert();
  
  // 状態管理
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null);
  const [optimisticDueDate, setOptimisticDueDate] = useState<string | null>(null);
  
  // 現在のタスクを取得（楽観的更新を考慮）
  const task = React.useMemo(() => {
    if (isCreating) {
      return {
        id: -1,
        title: '',
        description: '',
        status: 'pending' as const,
        priority: 'medium' as const,
        dueDate: defaultDueDate || '',
        parentId: defaultParentId,
        children: [],
        isRoutine: false,
        routineType: null,
        lastGeneratedAt: null,
        routineParentId: null,
        createdAt: new Date().toISOString(),
        completedAt: undefined,
        tagIds: [],
        expanded: false,
        tags: [],
        isParentInFilter: false
      };
    }
    
    if (initialTask) {
      return {
        ...initialTask,
        title: optimisticTitle || initialTask.title,
        description: optimisticDescription !== null ? optimisticDescription : (initialTask.description || ''),
        dueDate: optimisticDueDate || initialTask.dueDate || ''
      };
    }
    
    return null;
  }, [isCreating, initialTask, optimisticTitle, optimisticDescription, optimisticDueDate, defaultParentId, defaultDueDate]);

  // 編集状態
  const [isEditingTitle, setIsEditingTitle] = useState(isCreating);
  const [isEditingDescription, setIsEditingDescription] = useState(isCreating);
  
  // 編集中の値
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  const [editedDescription, setEditedDescription] = useState(task?.description || '');
  const [editedDueDate, setEditedDueDate] = useState(() => {
    if (task?.dueDate) {
      return new Date(task.dueDate).toISOString().split('T')[0];
    }
    return '';
  });
  const [editedParentId, setEditedParentId] = useState<number | undefined>(task?.parentId);
  const [editedStatus, setEditedStatus] = useState(task?.status || 'pending');
  const [editedPriority, setEditedPriority] = useState(task?.priority || 'medium');
  const [editedIsRoutine, setEditedIsRoutine] = useState(task?.isRoutine || false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初期化
  useEffect(() => {
    if (isOpen && !isInitialized) {
      if (task) {
        setEditedTitle(task.title);
        setEditedDescription(task.description || '');
        setEditedDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setEditedParentId(task.parentId);
        setEditedStatus(task.status);
        setEditedPriority(task.priority);
        setEditedIsRoutine(task.isRoutine || false);
      }
      setIsInitialized(true);
    }
    
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, task, isInitialized]);

  // タスクが変更されたときの更新
  useEffect(() => {
    if (task) {
      setEditedTitle(optimisticTitle || task.title);
      setEditedDescription(optimisticDescription !== null ? optimisticDescription : (task.description || ''));
      setEditedDueDate(optimisticDueDate || (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''));
    }
  }, [task, optimisticTitle, optimisticDescription, optimisticDueDate]);

  // 利用可能な親タスクの取得
  const availableParentTasks = React.useMemo(() => {
    if (!tasks || isCreating) return [];
    
    const flatTasks = flattenTasks(tasks);
    const currentTaskId = task?.id;
    
    return flatTasks
      .filter(t => t.id !== currentTaskId)
      .map(t => ({
        id: t.id,
        title: t.title,
        depth: 0 // 簡略化のため深度は0固定
      }));
  }, [tasks, task?.id, isCreating]);

  // モーダル表示時のスクロール無効化
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
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

  // ハンドラー関数
  const handleTitleSave = async (title: string) => {
    if (isCreating) {
      if (task?.id === -1) {
        try {
          setIsLoading(true);
          setOptimisticTitle(title);
          setIsEditingTitle(false);
          
          const newTask = await createTask({
            title,
            description: editedDescription,
            status: editedStatus,
            priority: editedPriority,
            parentId: editedParentId,
            dueDate: editedDueDate ? new Date(editedDueDate).toISOString() : undefined,
            isRoutine: editedIsRoutine
          });
          
          onClose();
          showAlert(`タスク「${title}」を作成しました`, { type: 'success' });
        } catch (error) {
          setOptimisticTitle(null);
          setIsEditingTitle(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setOptimisticTitle(title);
        setIsEditingTitle(false);
      }
    } else if (title !== task?.title) {
      try {
        setOptimisticTitle(title);
        setIsEditingTitle(false);
        if (task) {
          await updateTask(task.id, { title });
        }
        setOptimisticTitle(null);
      } catch (error) {
        setOptimisticTitle(null);
        setIsEditingTitle(true);
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = async (description: string) => {
    if (isCreating) {
      if (editedTitle.trim() && editedTitle.trim().length <= 100) {
        try {
          setIsLoading(true);
          setOptimisticDescription(description);
          setIsEditingDescription(false);
          
          const newTask = await createTask({
            title: editedTitle.trim(),
            description,
            status: editedStatus,
            priority: editedPriority,
            parentId: editedParentId,
            dueDate: editedDueDate ? new Date(editedDueDate).toISOString() : undefined,
            isRoutine: editedIsRoutine
          });
          
          onClose();
          showAlert(`タスク「${editedTitle.trim()}」を作成しました`, { type: 'success' });
        } catch (error) {
          setOptimisticDescription(null);
          setIsEditingDescription(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setOptimisticDescription(description);
      }
      return;
    }
    
    if (description !== (task?.description || '')) {
      try {
        setOptimisticDescription(description);
        setIsEditingDescription(false);
        
        if (task) {
          await updateTask(task.id, { description });
        }
        setOptimisticDescription(null);
      } catch (error) {
        setOptimisticDescription(null);
        setIsEditingDescription(true);
      }
    } else {
      setIsEditingDescription(false);
    }
  };

  const handleDescriptionCancel = () => {
    setIsEditingDescription(false);
  };

  const handleUpdate = async (updates: Partial<Task>) => {
    if (task) {
      await updateTask(task.id, updates);
    }
  };

  const handleChildTaskClick = (childTask: Task) => {
    setLocation(`/tasks/${childTask.id}`);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  return createPortal(
    <div className="task-detail-modal-backdrop" onClick={handleBackgroundClick}>
      <div className="task-detail-modal">
        <div className="task-detail-modal-header">
          <button 
            className="task-detail-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="task-detail-content">
          <TaskDetailHeader
            task={task}
            isCreating={isCreating}
            isEditingTitle={isEditingTitle}
            setIsEditingTitle={setIsEditingTitle}
            onTitleSave={handleTitleSave}
            onTitleCancel={handleTitleCancel}
            optimisticTitle={optimisticTitle}
          />
          
          <TaskDetailDescription
            task={task}
            isCreating={isCreating}
            isEditingDescription={isEditingDescription}
            setIsEditingDescription={setIsEditingDescription}
            onDescriptionSave={handleDescriptionSave}
            onDescriptionCancel={handleDescriptionCancel}
            optimisticDescription={optimisticDescription}
          />
          
          <TaskDetailMetadata
            task={task}
            isCreating={isCreating}
            editedStatus={editedStatus}
            editedPriority={editedPriority}
            editedDueDate={editedDueDate}
            setEditedStatus={setEditedStatus}
            setEditedPriority={setEditedPriority}
            setEditedDueDate={setEditedDueDate}
            onStatusChange={onStatusChange}
            onUpdate={handleUpdate}
            optimisticDueDate={optimisticDueDate}
          />
          
          {!isCreating && (
            <div className="task-detail-field">
              <label className="task-detail-label">親タスク</label>
              <ParentTaskSelector
                availableTasks={availableParentTasks}
                selectedParentId={editedParentId}
                onParentSelect={setEditedParentId}
              />
            </div>
          )}
          
          <TaskDetailSubtasks
            task={task}
            onChildTaskClick={handleChildTaskClick}
          />
          
          <TaskDetailActions
            isCreating={isCreating}
            editedTitle={editedTitle}
            onSave={() => handleTitleSave(editedTitle)}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskDetailModal;