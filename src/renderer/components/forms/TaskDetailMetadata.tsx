import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { useGlobalAlert } from '../../hooks';
import { isParentTask } from '../../utils/taskUtils';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants/task';
import StatusPriorityModal from '../modals/StatusPriorityModal';
import GoogleSeparatedDateTimePicker from '../ui/GoogleSeparatedDateTimePicker';
import { updateDateTimeInput } from '../../utils/lightDateUtils';



interface TaskDetailMetadataProps {
  task: Task;
  isCreating: boolean;
  editedStatus: 'pending' | 'in_progress' | 'completed';
  editedPriority: 'low' | 'medium' | 'high' | 'urgent';
  editedStartDate?: string;
  editedEndDate?: string;
  editedParentId?: number | undefined;
  setEditedStatus: (status: 'pending' | 'in_progress' | 'completed') => void | Promise<void>;
  setEditedPriority: (priority: 'low' | 'medium' | 'high' | 'urgent') => void | Promise<void>;
  setEditedStartDate?: (date: string) => void | Promise<void>;
  setEditedEndDate?: (date: string) => void | Promise<void>;
  setEditedParentId?: (parentId: number | undefined) => void;
  onStatusChange?: () => void;
  onUpdate?: (updates: Partial<Task>) => Promise<void>;
  optimisticStartDate?: string | null;
  optimisticEndDate?: string | null;
  hideTimeWhenDateOnly?: boolean; // 日付のみの場合に時刻フィールドを非表示
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
  optimisticEndDate,
  hideTimeWhenDateOnly = false
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
    
    if (onStatusChange) {
      onStatusChange();
    }
    
    // 統一されたハンドラーを呼び出し（自動保存対応）
    await setEditedStatus(newStatus as 'pending' | 'in_progress' | 'completed');
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
    
    // 統一されたハンドラーを呼び出し（自動保存対応）
    await setEditedPriority(newPriority as 'low' | 'medium' | 'high' | 'urgent');
  };

  return (
    <div className="task-detail-metadata">
      {/* ステータスと優先度を横並び */}
      <div className="task-detail-metadata-row">
        {/* ステータス */}
        <div className="task-detail-field task-detail-field-half task-detail-field-no-border">
          <label className="task-detail-label">ステータス</label>
          <div className="task-detail-field-content">
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
        </div>

        {/* 優先度 */}
        <div className="task-detail-field task-detail-field-half task-detail-field-no-border">
          <label className="task-detail-label">優先度</label>
          <div className="task-detail-field-content">
            <span 
              ref={priorityRef}
              className={`priority ${isCreating ? editedPriority : task.priority}`}
              onClick={handlePriorityClick}
            >
              {TASK_PRIORITY_LABELS[isCreating ? editedPriority : task.priority]}
            </span>
          </div>
        </div>
      </div>

      {/* 日時セクション */}
      <div className="task-detail-metadata-datetime">

        {/* 開始日時 */}
        <div className="task-detail-field datetime-field start-datetime-field task-detail-field-no-border">
          <label className="task-detail-label">開始日時</label>
          <div className="task-detail-field-content">
            <GoogleSeparatedDateTimePicker
              value={editedStartDate || ''}
              onChange={async (date) => {
                if (setEditedStartDate) {
                  await setEditedStartDate(date);
                }
              }}
              placeholder="開始日時を設定"
              showTime={true}
              timeInterval={15}
              hideTimeWhenDateOnly={hideTimeWhenDateOnly}
            />
          </div>
        </div>

        {/* 終了日時 */}
        <div className="task-detail-field datetime-field end-datetime-field task-detail-field-no-border">
          <label className="task-detail-label">終了日時</label>
          <div className="task-detail-field-content">
            <GoogleSeparatedDateTimePicker
              value={editedEndDate || ''}
              onChange={async (date) => {
                if (setEditedEndDate) {
                  await setEditedEndDate(date);
                }
              }}
              placeholder="終了日時を設定"
              showTime={true}
              timeInterval={15}
              hideTimeWhenDateOnly={hideTimeWhenDateOnly}
            />
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