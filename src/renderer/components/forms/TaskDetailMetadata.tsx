import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { useGlobalAlert } from '../../hooks';
import { isParentTask } from '../../utils/taskUtils';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants/task';
import StatusPriorityModal from '../modals/StatusPriorityModal';

interface TaskDetailMetadataProps {
  task: Task;
  isCreating: boolean;
  editedStatus: 'pending' | 'in_progress' | 'completed';
  editedPriority: 'low' | 'medium' | 'high' | 'urgent';
  editedDueDate: string;
  setEditedStatus: (status: 'pending' | 'in_progress' | 'completed') => void;
  setEditedPriority: (priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  setEditedDueDate: (date: string) => void;
  onStatusChange?: () => void;
  onUpdate?: (updates: Partial<Task>) => Promise<void>;
  optimisticDueDate?: string | null;
}

const TaskDetailMetadata: React.FC<TaskDetailMetadataProps> = ({
  task,
  isCreating,
  editedStatus,
  editedPriority,
  editedDueDate,
  setEditedStatus,
  setEditedPriority,
  setEditedDueDate,
  onStatusChange,
  onUpdate,
  optimisticDueDate
}) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { showAlert } = useGlobalAlert();

  // 期限日編集ハンドラー
  const handleDueDateEdit = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsEditingDueDate(true);
    
    setTimeout(() => {
      if (dueDateInputRef.current) {
        dueDateInputRef.current.focus();
      }
    }, 0);
  };

  const handleDueDateSave = async () => {
    if (isCreating) {
      setIsEditingDueDate(false);
      return;
    }
    
    const currentDueDate = task.dueDate;
    const currentDateString = currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : '';
    
    if (editedDueDate !== currentDateString) {
      try {
        const newDueDate = editedDueDate ? new Date(editedDueDate).toISOString() : undefined;
        setIsEditingDueDate(false);
        if (onUpdate) {
          await onUpdate({ dueDate: newDueDate });
        }
      } catch (error) {
        setIsEditingDueDate(true);
      }
    } else {
      setIsEditingDueDate(false);
    }
  };

  const handleDueDateCancel = () => {
    const dueDate = task.dueDate;
    setEditedDueDate(dueDate ? new Date(dueDate).toISOString().split('T')[0] : '');
    setIsEditingDueDate(false);
  };

  // ステータス編集ハンドラー
  const handleStatusClick = () => {
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
      setEditedStatus(newStatus as 'pending' | 'in_progress' | 'completed');
      return;
    }
    
    if (newStatus !== task.status) {
      try {
        if (onStatusChange) {
          onStatusChange();
        }
        
        if (onUpdate) {
          await onUpdate({ status: newStatus as 'pending' | 'in_progress' | 'completed' });
        }
      } catch (error) {
        // エラーハンドリング
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
      setEditedPriority(newPriority as 'low' | 'medium' | 'high' | 'urgent');
      return;
    }
    
    if (newPriority !== task.priority) {
      try {
        if (onUpdate) {
          await onUpdate({ priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' });
        }
      } catch (error) {
        // エラーハンドリング
      }
    }
  };

  const handleDelayedBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      handleDueDateSave();
      blurTimeoutRef.current = null;
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDueDateSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleDueDateCancel();
    }
  };

  const displayDueDate = optimisticDueDate || (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');

  return (
    <div className="task-detail-metadata">
      <div className="task-detail-metadata-grid">
        {/* ステータス */}
        <div className="task-detail-field">
          <label className="task-detail-label">ステータス</label>
          <span 
            ref={statusRef}
            className={`status ${isCreating ? editedStatus : task.status} ${!isCreating && isParentTask(task) ? 'parent-task-status' : ''}`}
            onClick={handleStatusClick}
            style={{ 
              cursor: (!isCreating && isParentTask(task)) ? 'default' : 'pointer' 
            }}
            title={(!isCreating && isParentTask(task)) ? '親タスクのステータスは子タスクから自動計算されます' : undefined}
          >
            {TASK_STATUS_LABELS[isCreating ? editedStatus : task.status]}
          </span>
        </div>

        {/* 優先度 */}
        <div className="task-detail-field">
          <label className="task-detail-label">優先度</label>
          <span 
            ref={priorityRef}
            className={`priority ${isCreating ? editedPriority : task.priority}`}
            onClick={handlePriorityClick}
          >
            {TASK_PRIORITY_LABELS[isCreating ? editedPriority : task.priority]}
          </span>
        </div>

        {/* 期限日 */}
        <div className="task-detail-field">
          <label className="task-detail-label">期限日</label>
          {isEditingDueDate ? (
            <input
              ref={dueDateInputRef}
              type="date"
              value={editedDueDate}
              onChange={(e) => setEditedDueDate(e.target.value)}
              onBlur={handleDelayedBlur}
              onKeyDown={handleKeyDown}
              className="task-detail-date-input"
            />
          ) : (
            <div 
              className="task-detail-date-display"
              onClick={handleDueDateEdit}
              title="クリックして編集"
            >
              {displayDueDate || '設定なし'}
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

export default TaskDetailMetadata;