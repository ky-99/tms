import { useState, useRef, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface UseTaskFormProps {
  task: Task;
  isCreating: boolean;
  defaultEndDate?: string;
  defaultParentId?: number;
}

interface UseTaskFormReturn {
  // 編集状態
  isEditingTitle: boolean;
  isEditingDescription: boolean;
  isEditingEndDate: boolean;
  isEditingStatus: boolean;
  isEditingPriority: boolean;
  
  // 編集値
  editedTitle: string;
  editedDescription: string;
  editedEndDate: string;
  editedStatus: TaskStatus;
  editedPriority: TaskPriority;
  
  // 楽観的更新状態
  optimisticTitle: string | null;
  optimisticDescription: string | null;
  optimisticEndDate: string | null;
  optimisticStatus: TaskStatus | null;
  optimisticPriority: TaskPriority | null;
  
  // IME状態
  isComposing: boolean;
  
  // 参照
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  statusRef: React.RefObject<HTMLSelectElement | null>;
  priorityRef: React.RefObject<HTMLSelectElement | null>;
  blurTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  
  // ハンドラー
  setIsEditingTitle: (editing: boolean) => void;
  setIsEditingDescription: (editing: boolean) => void;
  setIsEditingEndDate: (editing: boolean) => void;
  setIsEditingStatus: (editing: boolean) => void;
  setIsEditingPriority: (editing: boolean) => void;
  
  setEditedTitle: (title: string) => void;
  setEditedDescription: (description: string) => void;
  setEditedEndDate: (endDate: string) => void;
  setEditedStatus: (status: TaskStatus) => void;
  setEditedPriority: (priority: TaskPriority) => void;
  
  setOptimisticTitle: (title: string | null) => void;
  setOptimisticDescription: (description: string | null) => void;
  setOptimisticEndDate: (endDate: string | null) => void;
  setOptimisticStatus: (status: TaskStatus | null) => void;
  setOptimisticPriority: (priority: TaskPriority | null) => void;
  
  setIsComposing: (composing: boolean) => void;
  
  // ユーティリティ
  handleDelayedBlur: (saveFunction: () => void) => void;
  resetForm: () => void;
}

export const useTaskForm = ({
  task,
  isCreating,
  defaultEndDate,
  defaultParentId
}: UseTaskFormProps): UseTaskFormReturn => {
  // 編集状態
  const [isEditingTitle, setIsEditingTitle] = useState(isCreating);
  const [isEditingDescription, setIsEditingDescription] = useState(isCreating);
  const [isEditingEndDate, setIsEditingEndDate] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  
  // 編集値の管理
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedEndDate, setEditedEndDate] = useState(() => {
    if (isCreating) {
      return defaultEndDate || '';
    }
    const endDate = task.endDate || (task as any).end_date;
    return endDate ? new Date(endDate).toISOString().split('T')[0] : '';
  });
  const [editedStatus, setEditedStatus] = useState<TaskStatus>(task.status);
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(task.priority);
  
  // 楽観的更新の状態管理
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null);
  const [optimisticEndDate, setOptimisticEndDate] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus | null>(null);
  const [optimisticPriority, setOptimisticPriority] = useState<TaskPriority | null>(null);
  
  // IME状態の管理
  const [isComposing, setIsComposing] = useState(false);
  
  // 参照
  const titleInputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 遅延実行ハンドラー（onBlurとonClickの競合を回避）
  const handleDelayedBlur = useCallback((saveFunction: () => void) => {
    blurTimeoutRef.current = setTimeout(() => {
      saveFunction();
      blurTimeoutRef.current = null;
    }, 150); // 150ms遅延してonClickイベントを待つ
  }, []);
  
  // フォームをリセット
  const resetForm = useCallback(() => {
    setIsEditingTitle(isCreating);
    setIsEditingDescription(isCreating);
    setIsEditingEndDate(false);
    setIsEditingStatus(false);
    setIsEditingPriority(false);
    
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setEditedStatus(task.status);
    setEditedPriority(task.priority);
    
    setOptimisticTitle(null);
    setOptimisticDescription(null);
    setOptimisticEndDate(null);
    setOptimisticStatus(null);
    setOptimisticPriority(null);
    
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, [task, isCreating]);
  
  return {
    // 編集状態
    isEditingTitle,
    isEditingDescription,
    isEditingEndDate,
    isEditingStatus,
    isEditingPriority,
    
    // 編集値
    editedTitle,
    editedDescription,
    editedEndDate,
    editedStatus,
    editedPriority,
    
    // 楽観的更新状態
    optimisticTitle,
    optimisticDescription,
    optimisticEndDate,
    optimisticStatus,
    optimisticPriority,
    
    // IME状態
    isComposing,
    
    // 参照
    titleInputRef,
    statusRef,
    priorityRef,
    blurTimeoutRef,
    
    // ハンドラー
    setIsEditingTitle,
    setIsEditingDescription,
    setIsEditingEndDate,
    setIsEditingStatus,
    setIsEditingPriority,
    
    setEditedTitle,
    setEditedDescription,
    setEditedEndDate,
    setEditedStatus,
    setEditedPriority,
    
    setOptimisticTitle,
    setOptimisticDescription,
    setOptimisticEndDate,
    setOptimisticStatus,
    setOptimisticPriority,
    
    setIsComposing,
    
    // ユーティリティ
    handleDelayedBlur,
    resetForm
  };
};