import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks';
import { Task } from '../../types';
import StatusPriorityModal from '../modals/StatusPriorityModal';
import { isParentTask, isTaskOverdue, getDueDateText } from '../../utils';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants/task';

interface TaskCardProps {
  task: Task;
  onTaskClick?: () => void;
  disableSelection?: boolean;
  isDetailView?: boolean; // 子タスクの詳細画面として表示されている場合true
  hideTodayText?: boolean; // 今日のタスクセクションでは「今日」テキストを非表示
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskClick, disableSelection = false, isDetailView = false, hideTodayText = false }) => {
  const [, setLocation] = useLocation();
  const { updateTask, createTaskAfter, deleteTask } = useTaskContext();
  const { setCurrentContext, setHoveredTask } = useShortcut();
  const { showAlert } = useGlobalAlert();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isOperationMode, setIsOperationMode] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);
  
  // 選択状態をホバーベースのみに変更
  const isSelected = false; // クリック選択を完全に削除
  
  
  // タスクのタイトルが外部から更新された場合に同期
  useEffect(() => {
    setEditedTitle(task.title);
    // 楽観的更新がない場合のみ更新
    if (optimisticTitle === null) {
      setOptimisticTitle(null);
    }
  }, [task.title]);

  const handleCardClick = () => {
    // カード全体のクリックでは何もしない（タイトルクリックのみでナビゲーション）
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOperationMode(true);
  };

  const handleExitOperationMode = () => {
    setIsOperationMode(false);
  };


  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    showAlert(`タスク「${task.title}」を削除しますか？この操作は元に戻せません。`, {
      type: 'danger',
      title: 'タスクを削除',
      confirmText: '削除',
      cancelText: 'キャンセル',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteTask(task.id);
          setIsOperationMode(false);
          showAlert('タスクを削除しました', {
            type: 'success',
            title: '削除完了',
          });
        } catch (error) {
          showAlert('タスクの削除に失敗しました', {
            type: 'error',
            title: 'エラー',
          });
        }
      },
    });
  };

  const handleAddSubTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const event = new CustomEvent('openTaskCreateModal', { detail: { parentId: task.id } });
      window.dispatchEvent(event);
      setIsOperationMode(false);
    } catch (error) {
      showAlert('子タスクの追加に失敗しました', {
        type: 'error',
        title: 'エラー',
      });
    }
  };

  const handleToggleRoutine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isRoutine = task.isRoutine;
      await updateTask(task.id, { 
        isRoutine: !isRoutine,
        routineType: !isRoutine ? 'daily' : null
      });
      setIsOperationMode(false);
    } catch (error) {
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 複製中の場合は複製を禁止
    if (isDuplicating) {
      return;
    }
    
    try {
      setIsDuplicating(true);
      const duplicatedTask: Partial<Task> = {
        title: `${task.title} (コピー)`,
        description: task.description,
        status: 'pending',
        priority: task.priority,
        dueDate: task.dueDate,
        parentId: task.parentId,
      };
      
      await createTaskAfter(duplicatedTask, task.id);
      setIsOperationMode(false);
      
      // 複製成功トーストを表示
      showAlert(`タスク「${task.title}」を複製しました`, {
        type: 'success',
      });
    } catch (error) {
      // 複製失敗トーストを表示
      showAlert('タスクの複製に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'), {
        type: 'error',
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  // ホバーによる一時的な選択状態の管理
  const handleMouseEnter = () => {
    if (!disableSelection && !isOperationMode) {
      setHoveredTask(task);
      setCurrentContext('taskSelected');
    }
  };

  const handleMouseLeave = () => {
    // マウスが離れたときはホバー状態を解除
    if (!disableSelection && !isOperationMode) {
      setHoveredTask(null);
      setCurrentContext('global');
    }
  };

  // 操作モード外クリックで終了
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOperationMode) {
        setIsOperationMode(false);
      }
    };

    if (isOperationMode) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOperationMode]);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 編集モードでない場合はナビゲーション
    if (!isEditingTitle && !isEditingStatus && !isEditingPriority && !isOperationMode) {
      if (onTaskClick) {
        onTaskClick();
      } else {
        setLocation(`/tasks/${task.id}`);
      }
    }
  };

  const handleTitleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(task.title);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      try {
        // 楽観的更新：即座にUIを更新
        setOptimisticTitle(editedTitle.trim());
        setIsEditingTitle(false);
        
        await updateTask(task.id, { title: editedTitle.trim() });
        
        // 成功時に楽観的更新をクリア
        setOptimisticTitle(null);
      } catch (error) {
        // エラー時は楽観的更新を元に戻す
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

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 親タスクまたはフィルタ中の親タスクの場合はステータス編集を無効にする
    if (isParentTask(task) || task.isParentInFilter) {
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
    // 編集状態を先に終了してちらつきを防ぐ
    setIsEditingStatus(false);
    
    if (newStatus !== task.status) {
      try {
        // タスク更新前にイベントを発火してスクロール位置を保存
        window.dispatchEvent(new CustomEvent('taskUpdateStart'));
        await updateTask(task.id, { status: newStatus as 'pending' | 'in_progress' | 'completed' });
      } catch (error) {
        // エラー時は編集状態に戻る
        setIsEditingStatus(true);
      }
    }
  };

  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    // 編集状態を先に終了してちらつきを防ぐ
    setIsEditingPriority(false);
    
    if (newPriority !== task.priority) {
      try {
        // タスク更新前にイベントを発火してスクロール位置を保存
        window.dispatchEvent(new CustomEvent('taskUpdateStart'));
        await updateTask(task.id, { priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' });
      } catch (error) {
        // エラー時は編集状態に戻る
        setIsEditingPriority(true);
      }
    }
  };

  // メモ化されたタスク状態計算
  const taskState = useMemo(() => {
    const isRoutine = task.isRoutine;
    const isParent = task.children && task.children.length > 0;
    const isCompleted = task.status === 'completed';
    const isOverdue = isTaskOverdue(task);
    const dueDateText = getDueDateText(task);

    return {
      isRoutine,
      isParent,
      isCompleted,
      isOverdue,
      dueDateText,
      statusText: TASK_STATUS_LABELS[task.status],
      priorityText: TASK_PRIORITY_LABELS[task.priority]
    };
  }, [task]);

  // メモ化されたスタイル計算
  const { className, style } = useMemo(() => {
    const { isRoutine, isCompleted, isOverdue } = taskState;
    
    const cls = `dashboard__task-card ${isOverdue ? 'dashboard__task-card--overdue' : ''} ${!isRoutine && isCompleted ? 'dashboard__task-card--completed dashboard__task-card--completed-today' : ''} ${isOperationMode ? 'dashboard__task-card--operation-mode' : ''} ${isRoutine ? 'dashboard__task-card--routine' : ''} ${isSelected ? 'dashboard__task-card--selected' : ''}`;
    
    const sty = {
      cursor: 'pointer' as const,
      ...(isOperationMode ? {
        borderColor: '#3b82f6',
        borderWidth: '2px',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
      } : !isRoutine && isCompleted ? {
        backgroundColor: '#d1fae5',
        borderColor: '#10b981',
        opacity: 1
      } : {})
    };

    return { className: cls, style: sty };
  }, [taskState, isOperationMode, isSelected]);

  return (
    <div 
      className={className}
      onClick={handleCardClick}
      onContextMenu={handleRightClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={style}
    >
      <div className="dashboard__task-card-header">
        <h3 className="dashboard__task-card-title">
          {taskState.isParent && (
            <span 
              className="parent-task-icon" 
              style={{ 
                color: '#8b5cf6', 
                marginRight: '6px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              title="親タスク"
            >
              ◎
            </span>
          )}
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={(e) => {
                e.stopPropagation();
                handleTitleSave();
              }}
              onKeyDown={handleTitleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
              className="dashboard__task-title-input"
            />
          ) : (
            <span 
              onClick={handleTitleClick} 
              onDoubleClick={handleTitleEditClick}
              className="dashboard__task-title-text"
            >
              {optimisticTitle || task.title}
            </span>
          )}
        </h3>
        <div className="dashboard__task-card-badges">
          <span 
            ref={statusRef}
            className={`dashboard__status dashboard__status--${task.status} ${(isParentTask(task) || task.isParentInFilter) ? 'dashboard__status--parent' : ''}`}
            onClick={handleStatusClick}
            style={{ cursor: (isParentTask(task) || task.isParentInFilter) ? 'default' : 'pointer' }}
            title={(isParentTask(task) || task.isParentInFilter) ? '親タスクのステータスは子タスクから自動計算されます' : undefined}
          >
            {taskState.statusText}
          </span>
          <span 
            ref={priorityRef}
            className={`dashboard__priority dashboard__priority--${task.priority}`}
            onClick={handlePriorityClick}
          >
            {taskState.priorityText}
          </span>
        </div>
      </div>
      
      {task.description && (
        <p className="dashboard__task-card-description">{task.description}</p>
      )}
      
      <div className="dashboard__task-card-footer">
        {task.dueDate && !taskState.isRoutine && taskState.dueDateText && !(hideTodayText && taskState.dueDateText === '今日') && (
          <span className={`dashboard__due-date ${taskState.isOverdue ? 'dashboard__due-date--overdue' : ''}`}>
            {taskState.dueDateText}
          </span>
        )}
      </div>

      {/* 選択インジケーター */}
      {isSelected && (
        <div className="task-selection-indicator" />
      )}

      {/* 操作モード時のクイックアクション */}
      {isOperationMode && (
        <div className="dashboard__task-operation-actions">
          <button
            className="dashboard__operation-btn dashboard__operation-btn--edit"
            onClick={(e) => {
              e.stopPropagation();
              handleTitleEditClick(e);
              setIsOperationMode(false);
            }}
            title="タスクを編集"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button
            className="dashboard__operation-btn dashboard__operation-btn--add"
            onClick={handleAddSubTask}
            title="子タスクを追加"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <button
            className={`dashboard__operation-btn ${taskState.isRoutine ? 'dashboard__operation-btn--routine-active' : 'dashboard__operation-btn--routine'}`}
            onClick={handleToggleRoutine}
            title={taskState.isRoutine ? 'ルーティンを解除' : 'ルーティンに設定'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
            </svg>
          </button>
          {!isDetailView && (
            <button
              className={`dashboard__operation-btn dashboard__operation-btn--duplicate ${isDuplicating ? 'dashboard__operation-btn--duplicating' : ''}`}
              onClick={handleDuplicate}
              disabled={isDuplicating}
              title={isDuplicating ? '複製中...' : 'タスクを複製'}
            >
              {isDuplicating ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="spinning">
                  <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                </svg>
              )}
            </button>
          )}
          <button
            className="dashboard__operation-btn dashboard__operation-btn--delete"
            onClick={handleQuickDelete}
            title="タスクを削除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
          <button
            className="dashboard__operation-btn dashboard__operation-btn--close"
            onClick={(e) => {
              e.stopPropagation();
              handleExitOperationMode();
            }}
            title="操作モードを終了"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      )}
      
      {/* ステータス編集モーダル */}
      {isEditingStatus && (
        <StatusPriorityModal
          type="status"
          currentValue={task.status}
          onSelect={handleStatusChange}
          onClose={() => setIsEditingStatus(false)}
          position={modalPosition}
        />
      )}
      
      {/* 優先度編集モーダル */}
      {isEditingPriority && (
        <StatusPriorityModal
          type="priority"
          currentValue={task.priority}
          onSelect={handlePriorityChange}
          onClose={() => setIsEditingPriority(false)}
          position={modalPosition}
        />
      )}
    </div>
  );
};

export default React.memo(TaskCard, (prevProps, nextProps) => {
  // task プロパティの詳細比較でメモ化を最適化
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;
  
  return (
    prevTask.id === nextTask.id &&
    prevTask.title === nextTask.title &&
    prevTask.status === nextTask.status &&
    prevTask.priority === nextTask.priority &&
    prevTask.description === nextTask.description &&
    prevTask.dueDate === nextTask.dueDate &&
    prevTask.isRoutine === nextTask.isRoutine &&
    prevTask.children?.length === nextTask.children?.length &&
    prevProps.onTaskClick === nextProps.onTaskClick &&
    prevProps.disableSelection === nextProps.disableSelection &&
    prevProps.isDetailView === nextProps.isDetailView &&
    prevProps.hideTodayText === nextProps.hideTodayText
  );
});