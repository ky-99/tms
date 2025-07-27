import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, Tag } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks';
import { flattenTasks } from '../../utils/taskUtils';
import { jstToLocalDateTime, validateAndAdjustDateTimes, getDateTimeAdjustmentMessage, separateDateAndTime, combineDateAndTime } from '../../utils/lightDateUtils';
import TagSelector from '../forms/TagSelector';
import ParentTaskSelector from '../forms/ParentTaskSelector';
import TaskDetailMetadata from '../forms/TaskDetailMetadata';
import TaskDetailSubtasks from '../forms/TaskDetailSubtasks';
import TaskDetailHeader from '../forms/TaskDetailHeader';
import TaskDetailDescription from '../forms/TaskDetailDescription';
import TaskDetailActions from '../forms/TaskDetailActions';
import TaskBreadcrumb from '../ui/TaskBreadcrumb';

// モーダルの表示設定
export interface ModalDisplayConfig {
  showTitle?: boolean;
  showDescription?: boolean;
  showDateTime?: boolean;
  showParentTask?: boolean;
  showStatus?: boolean;
  showPriority?: boolean;
  showSubtasks?: boolean;
  showTags?: boolean;
}

// フィールドの編集モード設定
export interface ModalEditConfig {
  titleAlwaysEditing?: boolean;
  descriptionAlwaysEditing?: boolean;
  enableDateTimeValidation?: boolean;
}

// モーダルの動作設定
export interface ModalBehaviorConfig {
  closeOnBackgroundClick?: boolean;
  closeOnEscape?: boolean;
  showSaveButton?: boolean;
  saveButtonText?: string;
  cancelButtonText?: string;
}

// ベースモーダルのProps
export interface BaseTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  isCreating?: boolean;
  defaultValues?: Partial<Task>;
  displayConfig?: ModalDisplayConfig;
  editConfig?: ModalEditConfig;
  behaviorConfig?: ModalBehaviorConfig;
  onStatusChange?: () => void;
  onSave?: (taskData: Partial<Task>) => Promise<void>;
  customActions?: React.ReactNode;
  hideTimeWhenDateOnly?: boolean;
}

// デフォルト設定
const DEFAULT_DISPLAY_CONFIG: ModalDisplayConfig = {
  showTitle: true,
  showDescription: true,
  showDateTime: true,
  showParentTask: true,
  showStatus: true,
  showPriority: true,
  showSubtasks: true,
  showTags: true
};

const DEFAULT_EDIT_CONFIG: ModalEditConfig = {
  titleAlwaysEditing: true,
  descriptionAlwaysEditing: true,
  enableDateTimeValidation: true
};

const DEFAULT_BEHAVIOR_CONFIG: ModalBehaviorConfig = {
  closeOnBackgroundClick: true,
  closeOnEscape: true,
  showSaveButton: true,
  saveButtonText: '保存',
  cancelButtonText: 'キャンセル'
};

const BaseTaskModal: React.FC<BaseTaskModalProps> = ({
  isOpen,
  onClose,
  task: initialTask,
  isCreating = false,
  defaultValues = {},
  displayConfig = {},
  editConfig = {},
  behaviorConfig = {},
  onStatusChange,
  onSave,
  customActions,
  hideTimeWhenDateOnly = false
}) => {
  const { 
    tasks, 
    tags,
    createTask, 
    updateTask
  } = useTaskContext();
  const { setCurrentContext } = useShortcut();
  const { showAlert } = useGlobalAlert();
  
  // 設定をマージ
  const display = { ...DEFAULT_DISPLAY_CONFIG, ...displayConfig };
  const edit = { ...DEFAULT_EDIT_CONFIG, ...editConfig };
  const behavior = { ...DEFAULT_BEHAVIOR_CONFIG, ...behaviorConfig };
  
  // 楽観的更新用状態
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null);
  const [optimisticStartDate, setOptimisticStartDate] = useState<string | null>(null);
  const [optimisticStartTime, setOptimisticStartTime] = useState<string | null>(null);
  const [optimisticEndDate, setOptimisticEndDate] = useState<string | null>(null);
  const [optimisticEndTime, setOptimisticEndTime] = useState<string | null>(null);
  const [optimisticTagIds, setOptimisticTagIds] = useState<number[] | null>(null);
  
  // 現在のタスクを取得（楽観的更新を考慮）
  const task = React.useMemo(() => {
    if (isCreating) {
      return {
        id: -1,
        title: '',
        description: '',
        status: 'pending' as const,
        priority: 'medium' as const,
        startDate: '',
        endDate: '',
        parentId: undefined,
        children: [],
        isRoutine: false,
        routineType: null,
        lastGeneratedAt: null,
        routineParentId: null,
        createdAt: new Date().toISOString(),
        completedAt: undefined,
        tagIds: [],
        expanded: false,
        tags: [],
        isParentInFilter: false,
        ...defaultValues
      };
    }
    
    if (initialTask) {
      const taskResult = {
        ...initialTask,
        title: optimisticTitle || initialTask.title,
        description: optimisticDescription !== null ? optimisticDescription : (initialTask.description || ''),
        startDate: optimisticStartDate || initialTask.startDate || '',
        endDate: optimisticEndDate || initialTask.endDate || '',
        startTime: optimisticStartTime !== null ? optimisticStartTime : initialTask.startTime,
        endTime: optimisticEndTime !== null ? optimisticEndTime : initialTask.endTime
      };
      
      return taskResult;
    }
    
    return null;
  }, [isCreating, initialTask, optimisticTitle, optimisticDescription, optimisticStartDate, optimisticEndDate, optimisticStartTime, optimisticEndTime, defaultValues]);

  // 編集状態
  const [isEditingTitle, setIsEditingTitle] = useState(edit.titleAlwaysEditing || false);
  const [isEditingDescription, setIsEditingDescription] = useState(edit.descriptionAlwaysEditing || false);
  const [isActivelyEditingDescription, setIsActivelyEditingDescription] = useState(false);
  
  // 編集中の値 - useEffectで初期化するため空文字で開始
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [editedParentId, setEditedParentId] = useState<number | undefined>(undefined);
  const [editedStatus, setEditedStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [editedPriority, setEditedPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [editedIsRoutine, setEditedIsRoutine] = useState(false);
  const [editedTagIds, setEditedTagIds] = useState<number[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初期化
  useEffect(() => {
    if (isOpen && !isInitialized) {
      if (task) {
        setEditedTitle(task.title);
        setEditedDescription(task.description || '');
        // startDateの処理も同様に修正
        let initialStartDate = '';
        if (task.startDate) {
          // 新スキーマ: 時刻も考慮して結合
          if (task.startTime) {
            initialStartDate = combineDateAndTime(task.startDate, task.startTime);
          } else {
            // 時刻がない場合は日付のみ
            initialStartDate = task.startDate;
          }
        } else if (task.startTime) {
          // 日付がなく時刻のみの場合（疎結合対応）
          initialStartDate = `T${task.startTime}`;
        } else if (isCreating && defaultValues.startDate) {
          // YYYY-MM-DD形式の場合はそのまま日付のみで設定
          if (defaultValues.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            initialStartDate = defaultValues.startDate;
          } else {
            initialStartDate = jstToLocalDateTime(defaultValues.startDate);
          }
        }
        
        setEditedStartDate(initialStartDate);
        // 新規作成時でdefaultValues.endDateがある場合も考慮
        let initialEndDate = '';
        if (task.endDate) {
          // 新スキーマ: 時刻も考慮して結合
          if (task.endTime) {
            initialEndDate = combineDateAndTime(task.endDate, task.endTime);
          } else {
            // 時刻がない場合は日付のみ
            initialEndDate = task.endDate;
          }
        } else if (task.endTime) {
          // 日付がなく時刻のみの場合（疎結合対応）
          initialEndDate = `T${task.endTime}`;
        } else if (isCreating && defaultValues.endDate) {
          // YYYY-MM-DD形式の場合はそのまま日付のみで設定
          if (defaultValues.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            initialEndDate = defaultValues.endDate;
          } else {
            initialEndDate = jstToLocalDateTime(defaultValues.endDate);
          }
        }
        
        setEditedEndDate(initialEndDate);
        setEditedParentId(task.parentId);
        setEditedStatus(task.status);
        setEditedPriority(task.priority);
        setEditedIsRoutine(task.isRoutine || false);
        // タグIDは初期化時は常に元のタスクデータを使用
        setEditedTagIds(task.tagIds || []);
        // 編集状態を設定
        setIsEditingTitle(edit.titleAlwaysEditing || false);
        setIsEditingDescription(edit.descriptionAlwaysEditing || false);
      }
      setIsInitialized(true);
    }
    
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, task, isInitialized, edit.titleAlwaysEditing, edit.descriptionAlwaysEditing, isCreating, defaultValues.endDate]);

  // タスクが変更されたときの更新（楽観的更新中は編集中の値を保持）
  useEffect(() => {
    if (task && !isCreating) {
      // タイトルは楽観的更新を反映
      setEditedTitle(optimisticTitle || task.title);
      
      // 説明は楽観的更新中でない場合かつアクティブに編集していない場合のみ更新（ユーザー入力を保護）
      if (optimisticDescription === null && !isActivelyEditingDescription) {
        setEditedDescription(task.description || '');
      }
      
      // タグIDは楽観的更新中でない場合のみ更新（ユーザー操作を保護）
      if (optimisticTagIds === null) {
        setEditedTagIds(task.tagIds || []);
      }
      
      // 日時は楽観的更新を反映
      let startDateValue = '';
      if (optimisticStartDate) {
        startDateValue = optimisticStartDate;
      } else if (task.startDate) {
        // 新スキーマ: 時刻も考慮して結合（楽観的更新の時刻も考慮）
        const effectiveStartTime = optimisticStartTime !== null ? optimisticStartTime : task.startTime;
        if (effectiveStartTime) {
          startDateValue = combineDateAndTime(task.startDate, effectiveStartTime);
        } else {
          // 時刻がない場合は日付のみ
          startDateValue = task.startDate;
        }
      } else {
        // 楽観的更新の時刻または元の時刻を考慮
        const effectiveStartTime = optimisticStartTime !== null ? optimisticStartTime : task.startTime;
        if (effectiveStartTime) {
          // 日付がなく時刻のみの場合（疎結合対応）
          startDateValue = `T${effectiveStartTime}`;
        }
      }
      setEditedStartDate(startDateValue);
      
      let endDateValue = '';
      if (optimisticEndDate) {
        endDateValue = optimisticEndDate;
      } else if (task.endDate) {
        // 新スキーマ: 時刻も考慮して結合（楽観的更新の時刻も考慮）
        const effectiveEndTime = optimisticEndTime !== null ? optimisticEndTime : task.endTime;
        if (effectiveEndTime) {
          endDateValue = combineDateAndTime(task.endDate, effectiveEndTime);
        } else {
          // 時刻がない場合は日付のみ
          endDateValue = task.endDate;
        }
      } else {
        // 楽観的更新の時刻または元の時刻を考慮
        const effectiveEndTime = optimisticEndTime !== null ? optimisticEndTime : task.endTime;
        if (effectiveEndTime) {
          // 日付がなく時刻のみの場合（疎結合対応）
          endDateValue = `T${effectiveEndTime}`;
        }
      }
      setEditedEndDate(endDateValue);
    }
  }, [task, optimisticTitle, optimisticDescription, optimisticStartDate, optimisticEndDate, optimisticStartTime, optimisticEndTime, optimisticTagIds, isCreating, isActivelyEditingDescription]);


  // 日時調整が有効かどうかのチェック用関数
  const isDateTimeValidationEnabled = React.useCallback(() => {
    return edit.enableDateTimeValidation;
  }, [edit.enableDateTimeValidation]);

  // 利用可能な親タスクの取得
  const availableParentTasks = React.useMemo(() => {
    if (!tasks) return [];
    
    const flatTasks = flattenTasks(tasks);
    const currentTaskId = task?.id;
    
    return flatTasks
      .filter(t => !isCreating ? t.id !== currentTaskId : true)
      .map(t => ({
        id: t.id,
        title: t.title,
        depth: 0
      }));
  }, [tasks, task?.id, isCreating]);

  // モーダル表示時のスクロール無効化とコンテキスト設定
  useEffect(() => {
    if (isOpen) {
      // モーダルが開いたらコンテキストをmodalOpenに設定
      setCurrentContext('modalOpen');
      
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // モーダルが閉じたら元のコンテキストに戻す
        setCurrentContext('global');
        
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, setCurrentContext]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && behavior.closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose, behavior.closeOnEscape]);

  // メタデータ変更の自動保存ハンドラー
  const handleMetadataUpdate = async (updates: Partial<Task>) => {
    if (!isCreating && task) {
      try {
        const updatedTask = await updateTask(task.id, updates);
        
        // 成功時：更新された値でUIステートを同期
        if (updates.startDate !== undefined || updates.startTime !== undefined) {
          if (updatedTask.startDate) {
            if (updatedTask.startTime) {
              const combined = combineDateAndTime(updatedTask.startDate, updatedTask.startTime);
              setEditedStartDate(combined);
            } else {
              setEditedStartDate(updatedTask.startDate);
              // 時刻がクリアされた場合は楽観的更新を維持（クリアしない）
              return;
            }
          } else if (updatedTask.startTime) {
            // 時刻のみの場合（日付なし）
            setEditedStartDate(`T${updatedTask.startTime}`);
          } else {
            setEditedStartDate('');
            // 時刻がクリアされた場合は楽観的更新を維持（クリアしない）
            return;
          }
          // 時刻が存在する場合のみ楽観的更新をクリア
          setOptimisticStartTime(null);
          setOptimisticStartDate(null);
        }
        if (updates.endDate !== undefined || updates.endTime !== undefined) {
          if (updatedTask.endDate) {
            if (updatedTask.endTime) {
              setEditedEndDate(combineDateAndTime(updatedTask.endDate, updatedTask.endTime));
            } else {
              setEditedEndDate(updatedTask.endDate);
              // 時刻がクリアされた場合は楽観的更新を維持（クリアしない）
              return;
            }
          } else if (updatedTask.endTime) {
            // 時刻のみの場合（日付なし）
            setEditedEndDate(`T${updatedTask.endTime}`);
          } else {
            setEditedEndDate('');
            // 時刻がクリアされた場合は楽観的更新を維持（クリアしない）
            return;
          }
          // 時刻が存在する場合のみ楽観的更新をクリア
          setOptimisticEndTime(null);
          setOptimisticEndDate(null);
        }
        if (updates.tagIds !== undefined) {
          // タグIDの更新が成功した場合、楽観的更新をクリア
          // editedTagIdsの更新はuseEffectで自動的に行われる
          // TaskDataContextからの更新が反映されるまで少し待ってから楽観的更新をクリア
          setTimeout(() => {
            setOptimisticTagIds(null);
          }, 50);
        }
      } catch (error) {
        console.error('❌ Failed to update task metadata:', error);
        showAlert('更新に失敗しました', { type: 'error' });
        // エラー時は前の状態に戻す
        if (updates.status !== undefined) setEditedStatus(task.status);
        if (updates.priority !== undefined) setEditedPriority(task.priority);
        if (updates.parentId !== undefined) setEditedParentId(task.parentId);
        if (updates.startDate !== undefined || updates.startTime !== undefined) {
          // 新スキーマ：分離された日付・時刻を結合して復元
          if (task.startDate) {
            if (task.startTime) {
              setEditedStartDate(combineDateAndTime(task.startDate, task.startTime));
            } else {
              setEditedStartDate(task.startDate);
            }
          } else if (task.startTime) {
            // 時刻のみの場合（日付なし）
            setEditedStartDate(`T${task.startTime}`);
          } else {
            setEditedStartDate('');
          }
        }
        if (updates.endDate !== undefined || updates.endTime !== undefined) {
          // 新スキーマ：分離された日付・時刻を結合して復元
          if (task.endDate) {
            if (task.endTime) {
              setEditedEndDate(combineDateAndTime(task.endDate, task.endTime));
            } else {
              setEditedEndDate(task.endDate);
            }
          } else if (task.endTime) {
            // 時刻のみの場合（日付なし）
            setEditedEndDate(`T${task.endTime}`);
          } else {
            setEditedEndDate('');
          }
        }
        if (updates.tagIds !== undefined) {
          setOptimisticTagIds(null);
          setEditedTagIds(task.tagIds || []);
        }
      }
    }
  };

  // タグ変更ハンドラー
  const handleTagsChange = async (newTagIds: number[]) => {
    // 楽観的更新：即座にUIを更新
    const previousTagIds = editedTagIds;
    setOptimisticTagIds(newTagIds);  // 楽観的更新状態を設定
    setEditedTagIds(newTagIds);
    
    try {
      await handleMetadataUpdate({ tagIds: newTagIds });
    } catch (error) {
      // エラー時は前の状態に戻す
      setOptimisticTagIds(null);
      setEditedTagIds(previousTagIds);
      throw error;
    }
  };

  // ステータス変更ハンドラー
  const handleStatusChange = async (newStatus: string) => {
    const status = newStatus as Task['status'];
    setEditedStatus(status);
    await handleMetadataUpdate({ status });
  };

  // 優先度変更ハンドラー
  const handlePriorityChange = async (newPriority: string) => {
    const priority = newPriority as Task['priority'];
    setEditedPriority(priority);
    await handleMetadataUpdate({ priority });
  };

  // 親タスク変更ハンドラー
  const handleParentChange = async (newParentId: number | undefined) => {
    setEditedParentId(newParentId);
    await handleMetadataUpdate({ parentId: newParentId });
  };

  // 日時変更ハンドラー
  const handleStartDateChange = async (newStartDate: string) => {
    setEditedStartDate(newStartDate);
    
    // 時刻がクリアされた場合は楽観的更新で即座にUIを更新
    const separated = separateDateAndTime(newStartDate);
    if (!separated.time && !newStartDate.includes('T') && !newStartDate.includes(':')) {
      // 時刻がクリアされた場合は楽観的更新を設定
      setOptimisticStartTime('');
    } else {
      // 時刻が設定された場合は楽観的更新をクリア
      setOptimisticStartTime(null);
    }
    
    // 日時検証を実行（有効な場合のみ）
    let finalStartDate = newStartDate;
    if (isDateTimeValidationEnabled() && newStartDate && editedEndDate) {
      const validation = validateAndAdjustDateTimes(newStartDate, editedEndDate);
      if (validation.wasAdjusted && validation.adjustmentType === 'start_adjusted') {
        // 調整が行われた場合は調整された値を使用
        finalStartDate = validation.adjustedStart;
        setEditedStartDate(finalStartDate);
        setOptimisticStartDate(finalStartDate);
        
        const message = getDateTimeAdjustmentMessage(validation.adjustmentType);
        showAlert(message, { type: 'success', title: '日時調整' });
      } else if (validation.wasAdjusted && validation.adjustmentType === 'end_adjusted') {
        // 終了日時が調整された場合
        setEditedEndDate(validation.adjustedEnd);
        setOptimisticEndDate(validation.adjustedEnd);
        
        const message = getDateTimeAdjustmentMessage(validation.adjustmentType);
        showAlert(message, { type: 'success', title: '日時調整' });
        
        // 終了日時も保存する必要がある
        const endSeparated = separateDateAndTime(validation.adjustedEnd);
        await handleMetadataUpdate({ 
          endDate: endSeparated.date || undefined,
          endTime: endSeparated.time || undefined
        });
      }
    }
    
    // 最終的な値で保存（分離形式で送信）
    const finalSeparated = separateDateAndTime(finalStartDate);
    const updates: Partial<Task> = {
      startDate: finalSeparated.date || undefined
    };
    
    // 時刻が明示的に含まれている場合は時刻も更新、含まれていない場合は時刻をクリア
    if (finalStartDate.includes('T') || finalStartDate.includes(':')) {
      updates.startTime = finalSeparated.time || undefined;
    } else {
      // 時刻が含まれていない場合は明示的に時刻をクリア
      updates.startTime = undefined;
    }
    
    await handleMetadataUpdate(updates);
  };

  const handleEndDateChange = async (newEndDate: string) => {
    setEditedEndDate(newEndDate);
    
    // 時刻がクリアされた場合は楽観的更新で即座にUIを更新
    const separated = separateDateAndTime(newEndDate);
    if (!separated.time && !newEndDate.includes('T') && !newEndDate.includes(':')) {
      // 時刻がクリアされた場合は楽観的更新を設定
      setOptimisticEndTime('');
    } else {
      // 時刻が設定された場合は楽観的更新をクリア
      setOptimisticEndTime(null);
    }
    
    // 日時検証を実行（有効な場合のみ）
    let finalEndDate = newEndDate;
    if (isDateTimeValidationEnabled() && editedStartDate && newEndDate) {
      const validation = validateAndAdjustDateTimes(editedStartDate, newEndDate);
      if (validation.wasAdjusted && validation.adjustmentType === 'end_adjusted') {
        // 調整が行われた場合は調整された値を使用
        finalEndDate = validation.adjustedEnd;
        setEditedEndDate(finalEndDate);
        setOptimisticEndDate(finalEndDate);
        
        const message = getDateTimeAdjustmentMessage(validation.adjustmentType);
        showAlert(message, { type: 'success', title: '日時調整' });
      }
    }
    
    // 最終的な値で保存（分離形式で送信）
    const finalSeparated = separateDateAndTime(finalEndDate);
    const updates: Partial<Task> = {
      endDate: finalSeparated.date || undefined
    };
    
    // 時刻が明示的に含まれている場合は時刻も更新、含まれていない場合は時刻をクリア
    if (finalEndDate.includes('T') || finalEndDate.includes(':')) {
      updates.endTime = finalSeparated.time || undefined;
    } else {
      // 時刻が含まれていない場合は明示的に時刻をクリア
      updates.endTime = undefined;
    }
    
    await handleMetadataUpdate(updates);
  };

  // タイトル変更ハンドラー
  const handleTitleChange = (title: string) => {
    setEditedTitle(title);
  };

  // 説明変更ハンドラー
  const handleDescriptionChange = (description: string) => {
    setIsActivelyEditingDescription(true);
    setEditedDescription(description);
  };

  const handleTitleSave = async (title: string) => {
    if (isCreating) {
      // 新規作成時は保存のみ（タスク作成はしない）
      setOptimisticTitle(title);
      setIsEditingTitle(false);
    } else if (title !== task?.title) {
      try {
        setOptimisticTitle(title);
        setIsEditingTitle(false);
        if (task) {
          await updateTask(task.id, { title });
        }
        setOptimisticTitle(null);
      } catch (error) {
        setOptimisticTitle(null);
        setIsEditingTitle(true);
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setEditedTitle(task?.title || '');
  };

  const handleDescriptionSave = async (description: string) => {
    setIsActivelyEditingDescription(false);
    if (isCreating) {
      // 新規作成時は保存のみ（タスク作成はしない）
      setOptimisticDescription(description);
      setIsEditingDescription(false);
    } else if (description !== (task?.description || '')) {
      try {
        setOptimisticDescription(description);
        setIsEditingDescription(false);
        if (task) {
          await updateTask(task.id, { description });
        }
        setOptimisticDescription(null);
      } catch (error) {
        setOptimisticDescription(null);
        setIsEditingDescription(true);
      }
    } else {
      setIsEditingDescription(false);
    }
  };

  const handleDescriptionCancel = () => {
    setIsActivelyEditingDescription(false);
    setIsEditingDescription(false);
    setEditedDescription(task?.description || '');
  };


  // 保存処理
  const handleSave = async () => {
    if (!task) return;
    
    // タイトルが空の場合はトーストを表示して処理を中断
    if (!editedTitle.trim()) {
      showAlert('タイトルを入力してください', { 
        type: 'warning',
        title: 'タイトルが必要です'
      });
      // タイトル編集モードに切り替え
      setIsEditingTitle(true);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const taskData: Partial<Task> = {
        title: editedTitle,
        description: editedDescription,
        status: editedStatus,
        priority: editedPriority,
        parentId: editedParentId,
        // 分離形式で送信
        ...(() => {
          const startSeparated = separateDateAndTime(editedStartDate);
          const endSeparated = separateDateAndTime(editedEndDate);
          
          
          return {
            startDate: startSeparated.date || undefined,
            startTime: startSeparated.time || undefined,
            endDate: endSeparated.date || undefined,
            endTime: endSeparated.time || undefined,
          };
        })(),
        isRoutine: editedIsRoutine,
        tagIds: editedTagIds
      };

      if (onSave) {
        await onSave(taskData);
      } else if (isCreating) {
        await createTask(taskData);
        showAlert(`タスク「${editedTitle}」を作成しました`, { type: 'success' });
      } else {
        await updateTask(task.id, taskData);
        showAlert(`タスク「${editedTitle}」を更新しました`, { type: 'success' });
      }
      
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      showAlert('保存に失敗しました', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // グローバルキーボードイベント（フォーカスなし状態でのEnter）
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // フォーカスされた要素がある場合は何もしない
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== document.body) {
        return;
      }

      // Enterキーで作成/更新を実行
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, handleSave]);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && behavior.closeOnBackgroundClick) {
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  return createPortal(
    <div className="task-detail-modal-backdrop" onClick={handleBackgroundClick}>
      <div className="task-detail-modal">
        <div className="task-detail-modal-header">
          <button 
            className="task-detail-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="task-detail-content">
          {/* ブレッドクラム（編集時のみ表示） */}
          {!isCreating && display.showTitle && (
            <TaskBreadcrumb
              task={task}
              tasks={tasks || []}
              isCreating={isCreating}
              parentId={editedParentId}
              onClose={onClose}
            />
          )}
          
          {/* タイトル */}
          {display.showTitle && (
            <TaskDetailHeader
              task={task}
              isCreating={isCreating}
              isEditingTitle={isEditingTitle}
              setIsEditingTitle={setIsEditingTitle}
              onTitleSave={handleTitleSave}
              onTitleCancel={handleTitleCancel}
              onTitleChange={handleTitleChange}
              optimisticTitle={optimisticTitle}
            />
          )}
          
          {/* 説明 */}
          {display.showDescription && (
            <TaskDetailDescription
              task={task}
              isCreating={isCreating}
              isEditingDescription={isEditingDescription}
              setIsEditingDescription={setIsEditingDescription}
              onDescriptionSave={handleDescriptionSave}
              onDescriptionCancel={handleDescriptionCancel}
              optimisticDescription={optimisticDescription}
              editedDescription={editedDescription}
              onDescriptionChange={handleDescriptionChange}
            />
          )}

          {display.showTags && (
            <div className="task-detail-field task-detail-field-no-border">
              <label className="task-detail-label">タグ</label>
              <div className="task-detail-field-content">
                <TagSelector
                  availableTags={tags || []}
                  selectedTagIds={editedTagIds}
                  onTagsChange={handleTagsChange}
                  placeholder="タグを選択"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* メタデータ（ステータス、優先度、日時） */}
          {(display.showStatus || display.showPriority || display.showDateTime) && (
            <TaskDetailMetadata
              task={task}
              isCreating={isCreating}
              editedStatus={editedStatus}
              editedPriority={editedPriority}
              editedStartDate={editedStartDate}
              editedEndDate={editedEndDate}
              setEditedStatus={handleStatusChange}
              setEditedPriority={handlePriorityChange}
              setEditedStartDate={handleStartDateChange}
              setEditedEndDate={handleEndDateChange}
              onStatusChange={onStatusChange}
              onUpdate={handleMetadataUpdate}
              hideTimeWhenDateOnly={hideTimeWhenDateOnly}
            />
          )}

          {/* 親タスク選択 */}
          {display.showParentTask && (
            <div className="task-detail-field parent-task-field task-detail-field-no-border">
              <label className="task-detail-label">親タスク</label>
              <div className="task-detail-field-content">
                <ParentTaskSelector
                  availableTasks={availableParentTasks}
                  selectedParentId={editedParentId}
                  onParentSelect={handleParentChange}
                />
              </div>
            </div>
          )}

          {/* 子タスク表示 */}
          {display.showSubtasks && !isCreating && task && (
            <TaskDetailSubtasks
              task={task}
              onChildTaskClick={() => {}} // BaseTaskModalでは何もしない
            />
          )}
          
          {/* カスタムアクション */}
          {customActions}
          
          {/* アクションボタン */}
          {behavior.showSaveButton && (
            <TaskDetailActions
              isCreating={isCreating}
              editedTitle={editedTitle}
              onSave={() => handleSave()}
              onCancel={onClose}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BaseTaskModal;