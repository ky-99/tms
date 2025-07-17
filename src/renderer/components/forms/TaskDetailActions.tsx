import React from 'react';

interface TaskDetailActionsProps {
  isCreating: boolean;
  editedTitle: string;
  onSave: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TaskDetailActions: React.FC<TaskDetailActionsProps> = ({
  isCreating,
  editedTitle,
  onSave,
  onCancel,
  isLoading = false
}) => {
  if (!isCreating) {
    return null;
  }

  return (
    <div className="task-detail-section">
      <div className="task-detail-actions">
        <button 
          className="task-detail-save-btn"
          onClick={onSave}
          disabled={!editedTitle.trim() || isLoading}
        >
          {isLoading ? 'タスクを作成中...' : 'タスクを作成'}
        </button>
        <button 
          className="task-detail-cancel-btn"
          onClick={onCancel}
          disabled={isLoading}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default TaskDetailActions;