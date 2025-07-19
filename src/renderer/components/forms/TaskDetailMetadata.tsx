import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { useGlobalAlert } from '../../hooks';
import { isParentTask } from '../../utils/taskUtils';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants/task';
import StatusPriorityModal from '../modals/StatusPriorityModal';
import GoogleSeparatedDateTimePicker from '../ui/GoogleSeparatedDateTimePicker';
import { localDateTimeToJST, formatLocalDateTime, updateDateTimeInput } from '../../utils/lightDateUtils';



interface TaskDetailMetadataProps {
  task: Task;
  isCreating: boolean;
  editedStatus: 'pending' | 'in_progress' | 'completed';
  editedPriority: 'low' | 'medium' | 'high' | 'urgent';
  editedStartDate?: string;
  editedEndDate?: string;
  editedParentId?: number | undefined;
  setEditedStatus: (status: 'pending' | 'in_progress' | 'completed') => void;
  setEditedPriority: (priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  setEditedStartDate?: (date: string) => void;
  setEditedEndDate?: (date: string) => void;
  setEditedParentId?: (parentId: number | undefined) => void;
  onStatusChange?: () => void;
  onUpdate?: (updates: Partial<Task>) => Promise<void>;
  optimisticStartDate?: string | null;
  optimisticEndDate?: string | null;
}

const TaskDetailMetadata: React.FC<TaskDetailMetadataProps> = ({
  task,
  isCreating,
  editedStatus,
  editedPriority,
  editedStartDate,
  editedEndDate,
  editedParentId,
  setEditedStatus,
  setEditedPriority,
  setEditedStartDate,
  setEditedEndDate,
  setEditedParentId,
  onStatusChange,
  onUpdate,
  optimisticStartDate,
  optimisticEndDate
}) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);
  
  const { showAlert } = useGlobalAlert();


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

        {/* 開始日時 */}
        <div className="task-detail-field datetime-field start-datetime-field">
          <label className="task-detail-label">開始日時</label>
          <GoogleSeparatedDateTimePicker
            value={editedStartDate || ''}
            onChange={(date) => {
              if (setEditedStartDate) {
                setEditedStartDate(date);
                if (!isCreating && onUpdate) {
                  const newStartDate = date ? localDateTimeToJST(date) : undefined;
                  // API層でバリデーションを処理するため、シンプルに更新
                  onUpdate({ startDate: newStartDate });
                }
              }
            }}
            placeholder="開始日時を設定"
            showTime={true}
            timeInterval={15}
          />
        </div>

        {/* 終了日時 */}
        <div className="task-detail-field datetime-field end-datetime-field">
          <label className="task-detail-label">終了日時</label>
          <GoogleSeparatedDateTimePicker
            value={editedEndDate || ''}
            onChange={(date) => {
              if (setEditedEndDate) {
                setEditedEndDate(date);
                if (!isCreating && onUpdate) {
                  const newEndDate = date ? localDateTimeToJST(date) : undefined;
                  // API層でバリデーションを処理するため、シンプルに更新
                  onUpdate({ endDate: newEndDate });
                }
              }
            }}
            placeholder="終了日時を設定"
            showTime={true}
            timeInterval={15}
          />
        </div>

        {/* 日時範囲表示 */}
        <div className="task-detail-field task-detail-datetime-range-display">
          <div className="datetime-range-text">
            {(() => {
              if (editedStartDate && editedEndDate) {
                return `${formatLocalDateTime(editedStartDate)} ~ ${formatLocalDateTime(editedEndDate)}`;
              } else if (editedStartDate) {
                return `${formatLocalDateTime(editedStartDate)} から開始`;
              } else if (editedEndDate) {
                return `${formatLocalDateTime(editedEndDate)} まで`;
              }
              return '日時未設定';
            })()
          }
          </div>
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