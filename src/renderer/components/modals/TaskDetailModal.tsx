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
import { jstToLocalDateTime, localDateTimeToJST, validateAndAdjustDateTimes, getDateTimeAdjustmentMessage } from '../../utils/lightDateUtils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  isCreating?: boolean;
  defaultParentId?: number;
  defaultEndDate?: string;
  onStatusChange?: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  task: initialTask, 
  isCreating = false,
  defaultParentId,
  defaultEndDate,
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
  const [optimisticStartDate, setOptimisticStartDate] = useState<string | null>(null);
  const [optimisticEndDate, setOptimisticEndDate] = useState<string | null>(null);
  
  // 現在のタスクを取得（楽観的更新を考慮）
  const task = React.useMemo(() => {
    if (isCreating) {
      return {
        id: -1,
        title: '',
        description: '',
        status: 'pending' as const,
        priority: 'medium' as const,
        startDate: '',
        endDate: defaultEndDate || '',
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
        startDate: optimisticStartDate || initialTask.startDate || '',
        endDate: optimisticEndDate || initialTask.endDate || ''
      };
    }
    
    return null;
  }, [isCreating, initialTask, optimisticTitle, optimisticDescription, optimisticStartDate, optimisticEndDate, defaultParentId, defaultEndDate]);

  // 編集状態 - 常時編集モード
  const [isEditingTitle, setIsEditingTitle] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(true);
  
  // 編集中の値
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  
  // タイトル変更のハンドラー
  const handleTitleChange = (title: string) => {
    setEditedTitle(title);
  };
  const [editedDescription, setEditedDescription] = useState(task?.description || '');
  const [editedStartDate, setEditedStartDate] = useState(() => {
    if (task?.startDate) {
      return jstToLocalDateTime(task.startDate);
    }
    return '';
  });
  const [editedEndDate, setEditedEndDate] = useState(() => {
    if (task?.endDate) {
      return jstToLocalDateTime(task.endDate);
    }
    // 新規作成時でdefaultEndDateがある場合
    if (isCreating && defaultEndDate) {
      return jstToLocalDateTime(defaultEndDate);
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
        setEditedStartDate(task.startDate ? jstToLocalDateTime(task.startDate) : '');
        setEditedEndDate(task.endDate ? jstToLocalDateTime(task.endDate) : '');
        setEditedParentId(task.parentId);
        setEditedStatus(task.status);
        setEditedPriority(task.priority);
        setEditedIsRoutine(task.isRoutine || false);
        // 常時編集モード
        setIsEditingTitle(true);
        setIsEditingDescription(true);
      }
      setIsInitialized(true);
    }
    
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, task, isInitialized, isCreating]);

  // タスクが変更されたときの更新
  useEffect(() => {
    if (task) {
      setEditedTitle(optimisticTitle || task.title);
      setEditedDescription(optimisticDescription !== null ? optimisticDescription : (task.description || ''));
      setEditedStartDate(optimisticStartDate || (task.startDate ? jstToLocalDateTime(task.startDate) : ''));
      setEditedEndDate(optimisticEndDate || (task.endDate ? jstToLocalDateTime(task.endDate) : ''));
    }
  }, [task, optimisticTitle, optimisticDescription, optimisticStartDate, optimisticEndDate]);

  // 日時変更時の整合性チェックと自動調整
  const handleDateTimeValidation = React.useCallback((startDate: string, endDate: string, changedField: 'start' | 'end') => {
    if (startDate && endDate) {
      const validation = validateAndAdjustDateTimes(startDate, endDate);
      
      if (validation.wasAdjusted) {
        // 自動調整が行われた場合は状態を更新
        if (validation.adjustmentType === 'end_adjusted') {
          setEditedEndDate(validation.adjustedEnd);
          // 楽観的更新も反映
          if (!isCreating) {
            setOptimisticEndDate(validation.adjustedEnd);
          }
        } else if (validation.adjustmentType === 'start_adjusted') {
          setEditedStartDate(validation.adjustedStart);
          // 楽観的更新も反映
          if (!isCreating) {
            setOptimisticStartDate(validation.adjustedStart);
          }
        }
        
        // ユーザーにフィードバック
        const message = getDateTimeAdjustmentMessage(validation.adjustmentType);
        showAlert(message, { type: 'success', title: '日時調整' });
      }
    }
  }, [isCreating, showAlert]);

  // カスタム日時変更ハンドラー
  const handleStartDateChange = React.useCallback((newStartDate: string) => {
    setEditedStartDate(newStartDate);
    // 少し遅延させて整合性チェック
    setTimeout(() => {
      handleDateTimeValidation(newStartDate, editedEndDate, 'start');
    }, 100);
  }, [editedEndDate, handleDateTimeValidation]);

  const handleEndDateChange = React.useCallback((newEndDate: string) => {
    setEditedEndDate(newEndDate);
    // 少し遅延させて整合性チェック
    setTimeout(() => {
      handleDateTimeValidation(editedStartDate, newEndDate, 'end');
    }, 100);
  }, [editedStartDate, handleDateTimeValidation]);

  // 利用可能な親タスクの取得
  const availableParentTasks = React.useMemo(() => {
    if (!tasks) return [];
    
    const flatTasks = flattenTasks(tasks);
    const currentTaskId = task?.id;
    
    // 新規作成時は全てのタスクを選択可能、編集時は自分自身を除外
    return flatTasks
      .filter(t => !isCreating ? t.id !== currentTaskId : true)
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
          
          await createTask({
            title,
            description: editedDescription,
            status: editedStatus,
            priority: editedPriority,
            parentId: editedParentId,
            startDate: editedStartDate ? localDateTimeToJST(editedStartDate) : undefined,
            endDate: editedEndDate ? localDateTimeToJST(editedEndDate) : undefined,
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
          
          await createTask({
            title: editedTitle.trim(),
            description,
            status: editedStatus,
            priority: editedPriority,
            parentId: editedParentId,
            startDate: editedStartDate ? localDateTimeToJST(editedStartDate) : undefined,
            endDate: editedEndDate ? localDateTimeToJST(editedEndDate) : undefined,
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
      // 楽観的更新を行う
      if (updates.startDate !== undefined) {
        const localStartDate = updates.startDate ? jstToLocalDateTime(updates.startDate) : '';
        setOptimisticStartDate(localStartDate);
      }
      if (updates.endDate !== undefined) {
        const localEndDate = updates.endDate ? jstToLocalDateTime(updates.endDate) : '';
        setOptimisticEndDate(localEndDate);
      }
      
      try {
        await updateTask(task.id, updates);
        // 成功時は楽観的更新をクリア
        if (updates.startDate !== undefined) {
          setOptimisticStartDate(null);
        }
        if (updates.endDate !== undefined) {
          setOptimisticEndDate(null);
        }
      } catch (error) {
        // エラー時は楽観的更新を元に戻す
        if (updates.startDate !== undefined) {
          setOptimisticStartDate(null);
          setEditedStartDate(task.startDate ? jstToLocalDateTime(task.startDate) : '');
        }
        if (updates.endDate !== undefined) {
          setOptimisticEndDate(null);
          setEditedEndDate(task.endDate ? jstToLocalDateTime(task.endDate) : '');
        }
      }
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
            onTitleChange={handleTitleChange}
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
            editedStartDate={editedStartDate}
            editedEndDate={editedEndDate}
            setEditedStatus={setEditedStatus}
            setEditedPriority={setEditedPriority}
            setEditedStartDate={handleStartDateChange}
            setEditedEndDate={handleEndDateChange}
            onStatusChange={onStatusChange}
            onUpdate={handleUpdate}
            optimisticStartDate={optimisticStartDate}
            optimisticEndDate={optimisticEndDate}
          />
          
          <div className="task-detail-field parent-task-field">
            <label className="task-detail-label">親タスク</label>
            <ParentTaskSelector
              availableTasks={availableParentTasks}
              selectedParentId={editedParentId}
              onParentSelect={setEditedParentId}
            />
          </div>
          
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