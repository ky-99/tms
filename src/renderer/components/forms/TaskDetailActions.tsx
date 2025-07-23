import React from 'react';

interface TaskDetailActionsProps {
  isCreating: boolean;
  editedTitle: string;
  onSave: () => void;
  onCancel: () => void;
  onDateTimeSave?: () => void;
  isLoading?: boolean;
}

const TaskDetailActions: React.FC<TaskDetailActionsProps> = ({
  isCreating,
  editedTitle,
  onSave,
  onCancel,
  onDateTimeSave,
  isLoading = false
}) => {
  if (isCreating) {
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
  }

  // 編集モードでは日付保存ボタンを表示
  return (
    <div className="task-detail-section">
      <div className="task-detail-actions">
        {onDateTimeSave && (
          <button 
            className="task-detail-save-btn"
            onClick={onDateTimeSave}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '変更を保存'}
          </button>
        )}
        <button 
          className="task-detail-cancel-btn"
          onClick={onCancel}
          disabled={isLoading}
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default TaskDetailActions;