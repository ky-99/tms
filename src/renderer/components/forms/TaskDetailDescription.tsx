import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { useGlobalAlert } from '../../hooks';

interface TaskDetailDescriptionProps {
  task: Task;
  isCreating: boolean;
  isEditingDescription: boolean;
  setIsEditingDescription: (editing: boolean) => void;
  onDescriptionSave: (description: string) => Promise<void>;
  onDescriptionCancel: () => void;
  optimisticDescription?: string | null;
}

const TaskDetailDescription: React.FC<TaskDetailDescriptionProps> = ({
  task,
  isCreating,
  isEditingDescription,
  setIsEditingDescription,
  onDescriptionSave,
  onDescriptionCancel,
  optimisticDescription
}) => {
  const [editedDescription, setEditedDescription] = useState(() => task.description || '');
  const [isComposing, setIsComposing] = useState(false);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showAlert } = useGlobalAlert();

  // タスクが変更されたときに説明を更新
  useEffect(() => {
    const desc = optimisticDescription ?? task.description ?? '';
    setEditedDescription(desc);
  }, [task.description, optimisticDescription]);

  const handleDescriptionEdit = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsEditingDescription(true);
    const desc = optimisticDescription ?? task.description ?? '';
    setEditedDescription(desc);
    
    setTimeout(() => {
      if (descriptionInputRef.current) {
        descriptionInputRef.current.focus();
      }
    }, 0);
  };

  const handleDescriptionSave = async () => {
    await onDescriptionSave(editedDescription);
  };

  const handleDescriptionCancel = () => {
    const desc = optimisticDescription ?? task.description ?? '';
    setEditedDescription(desc);
    onDescriptionCancel();
  };

  const handleDelayedBlur = () => {
    if (isComposing) return;
    
    blurTimeoutRef.current = setTimeout(() => {
      handleDescriptionSave();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && !isComposing) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleDescriptionCancel();
    }
  };

  return (
    <div className="task-detail-description">
      <div className="task-detail-field">
        <label className="task-detail-label">説明</label>
        {isEditingDescription ? (
          <div className="task-detail-description-edit">
            <textarea
              ref={descriptionInputRef}
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleDelayedBlur}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="task-detail-description-input"
              placeholder="タスクの説明を入力..."
              rows={4}
            />
            <div className="task-detail-description-actions">
              <button 
                type="button" 
                onClick={handleDescriptionSave}
                className="btn btn-sm btn-primary"
              >
                保存
              </button>
              <button 
                type="button" 
                onClick={handleDescriptionCancel}
                className="btn btn-sm btn-secondary"
              >
                キャンセル
              </button>
            </div>
            <div className="task-detail-hint">
              ⌘+Enter で保存、Esc でキャンセル
            </div>
          </div>
        ) : (
          <div 
            className="task-detail-description-display"
            onClick={handleDescriptionEdit}
            title="クリックして編集"
          >
            {optimisticDescription !== null ? optimisticDescription : (task.description || '説明を追加...')}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailDescription;