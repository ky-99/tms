import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { useGlobalAlert } from '../../hooks';

interface TaskDetailHeaderProps {
  task: Task;
  isCreating: boolean;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  onTitleSave: (title: string) => Promise<void>;
  onTitleCancel: () => void;
  onTitleChange?: (title: string) => void;
  optimisticTitle?: string | null;
}

const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  task,
  isCreating,
  isEditingTitle,
  setIsEditingTitle,
  onTitleSave,
  onTitleCancel,
  onTitleChange,
  optimisticTitle
}) => {
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isComposing, setIsComposing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showAlert } = useGlobalAlert();

  // タスクが変更されたときにタイトルを更新
  useEffect(() => {
    setEditedTitle(optimisticTitle || task.title);
  }, [task.title, optimisticTitle]);

  // 編集モードになったときに入力フィールドにフォーカス（選択はしない）
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current && isCreating) {
      // 新規作成時のみフォーカス
      const timeout = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isEditingTitle, isCreating]);

  const handleTitleEdit = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsEditingTitle(true);
    setEditedTitle(optimisticTitle || task.title);
  };

  const handleTitleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    
    if (trimmedTitle.length > 100) {
      showAlert('タイトルは100文字以内で入力してください', {
        type: 'warning',
        title: '文字数制限',
      });
      setEditedTitle(trimmedTitle.substring(0, 100));
      return;
    }
    
    if (!trimmedTitle) {
      if (isCreating) {
        return;
      }
      setIsEditingTitle(false);
      return;
    }
    
    await onTitleSave(trimmedTitle);
  };

  const handleTitleCancel = () => {
    setEditedTitle(task.title);
    onTitleCancel();
  };

  const handleDelayedBlur = () => {
    if (isComposing) return;
    
    blurTimeoutRef.current = setTimeout(() => {
      // 新規作成時はblurでは保存しない（Enterキーまたは明示的な保存のみ）
      if (isCreating) {
        return;
      }
      handleTitleSave();
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  return (
    <div className="task-detail-header">
      <div className="task-detail-title-section">
        <input
          ref={titleInputRef}
          type="text"
          value={editedTitle}
          onChange={(e) => {
            setEditedTitle(e.target.value);
            if (onTitleChange) {
              onTitleChange(e.target.value);
            }
          }}
          onBlur={handleDelayedBlur}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          className="task-detail-title-input"
          placeholder="タスクのタイトルを入力..."
          maxLength={100}
        />
      </div>
      
    </div>
  );
};

export default TaskDetailHeader;