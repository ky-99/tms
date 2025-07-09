import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../contexts/TaskContext';
import { Task } from '../types';
import StatusPriorityModal from './StatusPriorityModal';
import { isParentTask } from '../utils/taskUtils';

interface TaskCardProps {
  task: Task;
  onTaskClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskClick }) => {
  const navigate = useNavigate();
  const { updateTask } = useTaskContext();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isOperationMode, setIsOperationMode] = useState(false);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);
  
  // タスクのタイトルが外部から更新された場合に同期
  useEffect(() => {
    setEditedTitle(task.title);
    // 楽観的更新がない場合のみ更新
    if (optimisticTitle === null) {
      setOptimisticTitle(null);
    }
  }, [task.title]);

  const handleCardClick = () => {
    if (!isEditingTitle && !isEditingStatus && !isEditingPriority && !isOperationMode) {
      if (onTaskClick) {
        onTaskClick();
      } else {
        navigate(`/tasks/${task.id}`);
      }
    }
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
    if (window.confirm('このタスクを削除しますか？')) {
      try {
        // タスク削除のAPIが必要 - 今は一旦アラートで代用
        alert('削除機能は実装予定です');
        setIsOperationMode(false);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleAddSubTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // 子タスク追加のAPIが必要 - 今は一旦アラートで代用
      alert('子タスク追加機能は実装予定です');
      setIsOperationMode(false);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleToggleRoutine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isRoutine = task.isRoutine || task.is_routine;
      await updateTask(task.id, { 
        isRoutine: !isRoutine,
        routineType: !isRoutine ? 'daily' : null
      });
      setIsOperationMode(false);
    } catch (error) {
      console.error('Failed to toggle routine:', error);
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
        console.error('Failed to update task title:', error);
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
    // 親タスクの場合はステータス編集を無効にする
    if (isParentTask(task)) {
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
        await updateTask(task.id, { status: newStatus as 'pending' | 'in_progress' | 'completed' | 'cancelled' });
      } catch (error) {
        console.error('Failed to update task status:', error);
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
        await updateTask(task.id, { priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' });
      } catch (error) {
        console.error('Failed to update task priority:', error);
        // エラー時は編集状態に戻る
        setIsEditingPriority(true);
      }
    }
  };

  // 定数マップ（useMemoを使わずに直接定義）
  const statusMap = {
    'pending': '未着手',
    'in_progress': '進行中',
    'completed': '完了',
    'cancelled': 'キャンセル'
  };

  const priorityMap = {
    'low': '低',
    'medium': '中',
    'high': '高',
    'urgent': '緊急'
  };

  // メモ化されたタスク状態計算
  const taskState = useMemo(() => {
    const dueDateValue = task.dueDate || task.due_date;
    const isRoutine = task.isRoutine || task.is_routine;
    const isParent = task.children && task.children.length > 0;
    const isCompleted = task.status === 'completed';
    
    
    let isOverdue = false;
    let dueDateText = null;
    
    if (dueDateValue) {
      const today = new Date();
      const dueDate = new Date(dueDateValue);
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      isOverdue = dueDate < today && !isCompleted;
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays !== 0) {
        if (diffDays === 1) dueDateText = '明日';
        else if (diffDays === -1) dueDateText = '昨日';
        else if (diffDays < 0) dueDateText = `${Math.abs(diffDays)}日前`;
        else dueDateText = `${diffDays}日後`;
      }
    }

    return {
      isRoutine,
      isParent,
      isCompleted,
      isOverdue,
      dueDateText,
      statusText: statusMap[task.status as keyof typeof statusMap] || task.status,
      priorityText: priorityMap[task.priority as keyof typeof priorityMap] || task.priority
    };
  }, [task]);

  // メモ化されたスタイル計算
  const { className, style } = useMemo(() => {
    const { isRoutine, isCompleted, isOverdue } = taskState;
    
    const cls = `task-card ${isOverdue ? 'overdue' : ''} ${!isRoutine && isCompleted ? 'completed completed-today' : ''} ${isOperationMode ? 'operation-mode' : ''} ${isRoutine ? 'routine-task' : ''}`;
    
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
  }, [taskState, isOperationMode]);

  return (
    <div 
      className={className}
      onClick={handleCardClick}
      onContextMenu={handleRightClick}
      style={style}
    >
      <div className="task-card-header">
        <h3 className="task-card-title">
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
              className="task-title-input"
            />
          ) : (
            <span onClick={handleTitleClick} className="task-title-text">
              {optimisticTitle || task.title}
            </span>
          )}
        </h3>
        <div className="task-card-badges">
          <span 
            ref={statusRef}
            className={`status ${task.status} ${isParentTask(task) ? 'parent-task-status' : ''}`}
            onClick={handleStatusClick}
            style={{ cursor: isParentTask(task) ? 'default' : 'pointer' }}
            title={isParentTask(task) ? '親タスクのステータスは子タスクから自動計算されます' : undefined}
          >
            {taskState.statusText}
          </span>
          <span 
            ref={priorityRef}
            className={`priority ${task.priority}`}
            onClick={handlePriorityClick}
          >
            {taskState.priorityText}
          </span>
        </div>
      </div>
      
      {task.description && (
        <p className="task-card-description">{task.description}</p>
      )}
      
      <div className="task-card-footer">
        {(task.dueDate || task.due_date) && !taskState.isRoutine && taskState.dueDateText && (
          <span className={`due-date ${taskState.isOverdue ? 'overdue' : ''}`}>
            {taskState.dueDateText}
          </span>
        )}
      </div>

      {/* 操作モード時のクイックアクション */}
      {isOperationMode && (
        <div className="task-operation-actions">
          <button
            className="operation-btn edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleTitleClick(e);
              setIsOperationMode(false);
            }}
            title="タスクを編集"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button
            className="operation-btn add-btn"
            onClick={handleAddSubTask}
            title="子タスクを追加"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <button
            className={`operation-btn ${taskState.isRoutine ? 'routine-active' : 'routine-btn'}`}
            onClick={handleToggleRoutine}
            title={taskState.isRoutine ? 'ルーティンを解除' : 'ルーティンに設定'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
            </svg>
          </button>
          <button
            className="operation-btn delete-btn"
            onClick={handleQuickDelete}
            title="タスクを削除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
          <button
            className="operation-btn close-btn"
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

export default TaskCard;