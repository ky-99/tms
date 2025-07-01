/**
 * TaskModal component - Refactored with new state management
 * Handles task creation and editing with improved UX
 */

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { useTaskContext, useErrorContext } from '../contexts';
import { useEscapeKey } from '../hooks';
import { Modal, TextInput, TextArea, Select, Button, LoadingSpinner } from './ui';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, DEFAULT_TASK_VALUES } from '../constants';
import { flattenTasks } from '../utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultParentId?: number;
  editingTask?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultParentId, 
  editingTask 
}) => {
  const { tasks, createTask, updateTask, loading } = useTaskContext();
  const { showSuccess, showError } = useErrorContext();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: DEFAULT_TASK_VALUES.status,
    priority: DEFAULT_TASK_VALUES.priority,
    parentId: '',
    dueDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle escape key
  useEscapeKey(() => {
    if (isOpen && !isSubmitting) {
      onClose();
    }
  }, isOpen);

  // Initialize form data when modal opens or editing task changes
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setFormData({
          title: editingTask.title || '',
          description: editingTask.description || '',
          status: editingTask.status || DEFAULT_TASK_VALUES.status,
          priority: editingTask.priority || DEFAULT_TASK_VALUES.priority,
          parentId: '', // Don't allow changing parent when editing
          dueDate: editingTask.dueDate 
            ? new Date(editingTask.dueDate).toISOString().split('T')[0] 
            : ''
        });
      } else {
        setFormData({
          title: '',
          description: '',
          status: DEFAULT_TASK_VALUES.status,
          priority: DEFAULT_TASK_VALUES.priority,
          parentId: defaultParentId ? defaultParentId.toString() : '',
          dueDate: ''
        });
      }
    }
  }, [isOpen, editingTask, defaultParentId]);

  // Generate parent options
  const parentOptions = React.useMemo(() => {
    const flatTasks = flattenTasks(tasks);
    const options = [{ value: '', label: 'なし（ルートタスク）' }];
    
    flatTasks
      .filter(task => !editingTask || task.id !== editingTask.id) // Don't allow self as parent
      .forEach(task => {
        options.push({
          value: task.id.toString(),
          label: task.title
        });
      });
    
    return options;
  }, [tasks, editingTask]);

  const statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value,
    label
  }));

  const priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label
  }));

  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.title.trim()) {
      showError('タイトルが必要です', 'タスクのタイトルを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status as TaskStatus,
        priority: formData.priority as TaskPriority,
        dueDate: formData.dueDate || undefined,
        parentId: formData.parentId ? parseInt(formData.parentId) : undefined,
      };

      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        showSuccess('タスクを更新しました');
      } else {
        await createTask(taskData);
        showSuccess('タスクを作成しました');
      }

      onClose();
    } catch (error) {
      showError(
        editingTask ? 'タスクの更新に失敗しました' : 'タスクの作成に失敗しました',
        error instanceof Error ? error.message : '不明なエラーが発生しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingTask ? 'タスクを編集' : 'タスクを作成'}
      size="lg"
      closeOnOverlayClick={!isSubmitting}
      className="task-modal"
    >
      <form onSubmit={handleSubmit} className="task-form">
        {/* Title */}
        <TextInput
          label="タイトル *"
          value={formData.title}
          onChange={handleInputChange('title')}
          placeholder="タスクのタイトルを入力"
          disabled={isSubmitting}
          required
        />

        {/* Description */}
        <TextArea
          label="説明"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="タスクの詳細説明（任意）"
          rows={3}
          disabled={isSubmitting}
        />

        <div className="form-row">
          {/* Status */}
          <Select
            label="ステータス"
            value={formData.status}
            onChange={handleInputChange('status')}
            options={statusOptions}
            disabled={isSubmitting}
          />

          {/* Priority */}
          <Select
            label="優先度"
            value={formData.priority}
            onChange={handleInputChange('priority')}
            options={priorityOptions}
            disabled={isSubmitting}
          />
        </div>

        {/* Parent Task - only for new tasks */}
        {!editingTask && (
          <div className="form-row">
            <Select
              label="親タスク"
              value={formData.parentId}
              onChange={handleInputChange('parentId')}
              options={parentOptions}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Due Date */}
        <div className="form-row">
          <TextInput
            type="date"
            label="期限日"
            value={formData.dueDate}
            onChange={handleInputChange('dueDate')}
            disabled={isSubmitting}
            placeholder="期限を設定"
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!formData.title.trim() || isSubmitting}
          >
            {editingTask ? '更新' : '作成'}
          </Button>
        </div>
      </form>
      
      {/* Global loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <LoadingSpinner size="lg" text="処理中..." />
        </div>
      )}
    </Modal>
  );
};

export default TaskModal;