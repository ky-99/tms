import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';
import { useGlobalAlert } from '../../hooks';
import { flattenTasks } from '../../utils/taskUtils';
import NotionLikeFilterModal from '../tasks/NotionLikeFilterModal';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants/task';

interface TaskMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
}

const TaskMergeModal: React.FC<TaskMergeModalProps> = ({ isOpen, onClose, allTasks }) => {
  const { updateTask, deleteTask, loadTasks, tags } = useTaskContext();
  const { showAlert } = useGlobalAlert();
  const [step, setStep] = useState<'select-tasks' | 'select-parent'>('select-tasks');
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [targetParentId, setTargetParentId] = useState<number | undefined | 'delete'>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentFilterQuery, setParentFilterQuery] = useState('');
  const [selectedParentFilterId, setSelectedParentFilterId] = useState<number | null>(null);
  // ステップ2用の検索・フィルター状態
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSelectedStatuses, setParentSelectedStatuses] = useState<TaskStatus[]>([]);
  const [parentSelectedPriorities, setParentSelectedPriorities] = useState<TaskPriority[]>([]);
  const [parentSelectedTagIds, setParentSelectedTagIds] = useState<number[]>([]);
  const [parentDateFilterFrom, setParentDateFilterFrom] = useState('');
  const [parentDateFilterTo, setParentDateFilterTo] = useState('');
  const [showParentFilterModal, setShowParentFilterModal] = useState(false);
  
  // フィルター状態（NotionLikeFilterModal対応）
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [includeParentTasks, setIncludeParentTasks] = useState(true);
  const [maintainHierarchy, setMaintainHierarchy] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const parentSelectorRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const parentFilterButtonRef = useRef<HTMLButtonElement>(null);

  // タスクツリーから特定のタスクを探す
  const findTaskInTree = (taskList: Task[], targetId: number): Task | null => {
    for (const task of taskList) {
      if (task.id === targetId) return task;
      if (task.children) {
        const found = findTaskInTree(task.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // タスクが別のタスクの子孫かどうかをチェック
  const isDescendantOf = (taskId: number, ancestorId: number, taskList: Task[]): boolean => {
    const findDescendant = (tasks: Task[]): boolean => {
      for (const task of tasks) {
        if (task.id === taskId) return true;
        if (task.children && findDescendant(task.children)) return true;
      }
      return false;
    };
    
    const ancestor = findTaskInTree(taskList, ancestorId);
    return ancestor ? findDescendant(ancestor.children || []) : false;
  };

  // 循環参照をチェックする関数
  const wouldCreateCircularReference = (selectedTaskIds: Set<number>, parentId: number | undefined | 'delete', taskList: Task[]): boolean => {
    if (parentId === undefined || parentId === 'delete') return false; // ルートタスクや削除の場合は循環参照なし
    
    // 選択されたタスクの中に、指定された親タスクの祖先が含まれているかチェック
    for (const selectedId of selectedTaskIds) {
      // 選択されたタスクが親タスクの祖先になる場合は循環参照
      if (isDescendantOf(parentId, selectedId, taskList)) {
        return true;
      }
    }
    
    return false;
  };

  // フラット化されたタスクリスト
  const flatTasks = flattenTasks(allTasks);
  
  // フィルターとマッチする関数（NotionLikeFilterModal対応版）
  const doesTaskMatchFilters = (task: Task): boolean => {
    // 検索フィルター
    if (searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // ステータスフィルター
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
      return false;
    }
    
    // 優先度フィルター
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
      return false;
    }
    
    // タグフィルター
    if (selectedTagIds.length > 0) {
      const hasMatchingTag = task.tagIds && task.tagIds.some(tagId => selectedTagIds.includes(tagId));
      if (!hasMatchingTag) return false;
    }
    
    // 親タスクフィルター
    if (selectedParentFilterId !== null) {
      if (selectedParentFilterId === 0) {
        // ルートタスク（親なし）でフィルター
        if (task.parentId) return false;
      } else {
        // 特定の親タスクでフィルター
        if (task.parentId !== selectedParentFilterId) return false;
      }
    }
    
    // 日付フィルター
    if (dateFilterFrom || dateFilterTo) {
      if (!task.endDate) return false;
      const taskDate = new Date(task.endDate);
      if (dateFilterFrom && taskDate < new Date(dateFilterFrom)) return false;
      if (dateFilterTo && taskDate > new Date(dateFilterTo)) return false;
    }
    
    return true;
  };

  // 検索とフィルタ適用
  const filteredTasks = flatTasks.filter(doesTaskMatchFilters);
  

  // フィルターオプション
  const statusOptions = [
    { value: 'pending' as TaskStatus, label: '未着手', color: '#6b7280' },
    { value: 'in_progress' as TaskStatus, label: '進行中', color: '#3b82f6' },
    { value: 'completed' as TaskStatus, label: '完了', color: '#10b981' },
  ];

  const priorityOptions = [
    { value: 'low' as TaskPriority, label: '低', color: '#6b7280' },
    { value: 'medium' as TaskPriority, label: '中', color: '#3b82f6' },
    { value: 'high' as TaskPriority, label: '高', color: '#f59e0b' },
    { value: 'urgent' as TaskPriority, label: '緊急', color: '#ef4444' },
  ];

  // 親タスクとして選択可能なタスク（選択されたタスクとその子孫、循環参照の原因となるタスクを除外）
  const availableParentTasks = flatTasks.filter(task => {
    if (selectedTasks.has(task.id)) return false;
    // 選択されたタスクの子孫も除外
    for (const selectedId of selectedTasks) {
      if (isDescendantOf(task.id, selectedId, allTasks)) return false;
    }
    // 循環参照をチェック
    if (wouldCreateCircularReference(selectedTasks, task.id, allTasks)) return false;
    return true;
  });

  // ステップ2用のフィルター関数
  const doesParentTaskMatchFilters = (task: Task): boolean => {
    // 検索フィルター
    if (parentSearchQuery.trim() !== '') {
      const searchLower = parentSearchQuery.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // ステータスフィルター
    if (parentSelectedStatuses.length > 0 && !parentSelectedStatuses.includes(task.status)) {
      return false;
    }
    
    // 優先度フィルター
    if (parentSelectedPriorities.length > 0 && !parentSelectedPriorities.includes(task.priority)) {
      return false;
    }
    
    // タグフィルター
    if (parentSelectedTagIds.length > 0) {
      const hasMatchingTag = task.tagIds && task.tagIds.some(tagId => parentSelectedTagIds.includes(tagId));
      if (!hasMatchingTag) return false;
    }
    
    // 日付フィルター
    if (parentDateFilterFrom || parentDateFilterTo) {
      if (!task.endDate) return false;
      const taskDate = new Date(task.endDate);
      if (parentDateFilterFrom && taskDate < new Date(parentDateFilterFrom)) return false;
      if (parentDateFilterTo && taskDate > new Date(parentDateFilterTo)) return false;
    }
    
    return true;
  };

  // 親タスク選択用のフィルタリング済みタスク（統合処理用）
  const mergeAvailableParentTasks = availableParentTasks.filter(doesParentTaskMatchFilters);



  // フィルターハンドラー（NotionLikeFilterModal対応版）
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTagIds([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setParentFilterQuery('');
    setSelectedParentFilterId(null);
    setDateFilterFrom('');
    setDateFilterTo('');
    setIncludeParentTasks(true);
    setMaintainHierarchy(false);
  };

  // アクティブフィルター確認
  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedTagIds.length > 0 ||
    selectedParentFilterId !== null ||
    dateFilterFrom !== '' ||
    dateFilterTo !== '' ||
    includeParentTasks === false ||
    maintainHierarchy === true;

  // タスク選択の切り替え
  const toggleTaskSelection = (taskId: number) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  // 全タスクの選択/解除（フィルタリング済みタスクのみ対象）
  const toggleAllTasks = () => {
    const filteredTaskIds = filteredTasks.map(task => task.id);
    const currentSelectedFromFiltered = Array.from(selectedTasks).filter(id => 
      filteredTaskIds.includes(id)
    );
    
    if (currentSelectedFromFiltered.length === filteredTasks.length) {
      // フィルタリング済みタスクがすべて選択されている場合：フィルタリング済みタスクのみ選択解除
      const newSelection = new Set(selectedTasks);
      filteredTaskIds.forEach(id => newSelection.delete(id));
      setSelectedTasks(newSelection);
    } else {
      // フィルタリング済みタスクを追加選択
      const newSelection = new Set(selectedTasks);
      filteredTaskIds.forEach(id => newSelection.add(id));
      setSelectedTasks(newSelection);
    }
  };

  // 統合実行
  const handleMerge = async () => {
    if (selectedTasks.size === 0) {
      showAlert('統合するタスクを選択してください', {
        type: 'warning',
        title: 'タスクを選択',
      });
      return;
    }

    // 削除の場合
    if (targetParentId === 'delete') {
      const confirmMessage = `選択された${selectedTasks.size}個のタスクを削除してもよろしいですか？\n\n注意: 子タスクも含めて削除されます。`;
      
      showAlert(confirmMessage, {
        type: 'danger',
        title: 'タスクを削除',
        confirmText: '削除',
        cancelText: 'キャンセル',
        showCancel: true,
        onConfirm: async () => {
          try {
            const taskIdsToDelete = Array.from(selectedTasks);
            const taskCount = taskIdsToDelete.length;
            
            // タスクを削除
            for (const taskId of taskIdsToDelete) {
              await deleteTask(taskId);
            }
            
            // 削除成功メッセージを表示
            showAlert(`${taskCount}件のタスクを削除しました`, {
              type: 'success',
            });
            
            setSelectedTasks(new Set());
            await loadTasks();
            onClose();
          } catch (error) {
            showAlert('タスクの削除に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'), {
              type: 'error',
              title: 'エラー',
            });
          }
        },
      });
      return;
    }

    // 循環参照チェック（削除以外の場合）
    if (typeof targetParentId !== 'string' && wouldCreateCircularReference(selectedTasks, targetParentId, allTasks)) {
      showAlert('選択された設定では循環参照が発生します。別の親タスクを選択してください。', {
        type: 'error',
        title: '循環参照エラー',
      });
      return;
    }


    try {
      // 選択されたタスクの親を変更
      const updatePromises = Array.from(selectedTasks).map(async (taskId) => {
        // undefinedをnullに変換してバックエンドに送信
        const parentIdValue = targetParentId === undefined ? null : targetParentId as number;
        const result = await updateTask(taskId, { parentId: parentIdValue as any });
        return result;
      });
      
      const results = await Promise.all(updatePromises);
      
      // タスクリストを更新（親タスクの進行度計算も自動実行される）
      await loadTasks();
      
      // 統合成功トーストを表示
      const targetName = targetParentId === undefined 
        ? 'ルートタスク' 
        : flatTasks.find(t => t.id === targetParentId)?.title || '指定された親タスク';
      
      showAlert(`${selectedTasks.size}個のタスクを「${targetName}」に統合しました`, {
        type: 'success',
      });
      
      // 成功後にモーダルを閉じる
      onClose();
      setStep('select-tasks');
      setSelectedTasks(new Set());
      setTargetParentId(undefined);
      setSearchQuery('');
      setParentFilterQuery('');
      setSelectedParentFilterId(null);
      setSelectedStatuses([]);
      setSelectedPriorities([]);
      setSelectedTagIds([]);
      setDateFilterFrom('');
      setDateFilterTo('');
      setIncludeParentTasks(true);
      setMaintainHierarchy(false);
      setShowFilterModal(false);
      // ステップ2の状態もリセット
      setParentSearchQuery('');
      setParentSelectedStatuses([]);
      setParentSelectedPriorities([]);
      setParentSelectedTagIds([]);
      setParentDateFilterFrom('');
      setParentDateFilterTo('');
      setShowParentFilterModal(false);
    } catch (error) {
      showAlert('タスクの統合に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'), {
        type: 'error',
        title: 'エラー',
      });
    }
  };


  // モーダルが閉じられた時のクリーンアップ
  useEffect(() => {
    if (!isOpen) {
      setStep('select-tasks');
      setSelectedTasks(new Set());
      setTargetParentId(undefined);
      setSearchQuery('');
      setParentFilterQuery('');
      setSelectedParentFilterId(null);
      setSelectedStatuses([]);
      setSelectedPriorities([]);
      setSelectedTagIds([]);
      setDateFilterFrom('');
      setDateFilterTo('');
      setIncludeParentTasks(true);
      setMaintainHierarchy(false);
      setShowFilterModal(false);
      // ステップ2の状態もリセット
      setParentSearchQuery('');
      setParentSelectedStatuses([]);
      setParentSelectedPriorities([]);
      setParentSelectedTagIds([]);
      setParentDateFilterFrom('');
      setParentDateFilterTo('');
      setShowParentFilterModal(false);
    }
  }, [isOpen]);

  // モーダル表示時のスクロール無効化（背景のみ）
  useEffect(() => {
    if (isOpen) {
      // 現在のスクロール位置を保存
      const scrollY = window.scrollY;
      
      // htmlとbodyの背景スクロールのみを無効化
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // キーボードによるスクロールを無効化（モーダル外の場合のみ）
      const preventScroll = (e: KeyboardEvent) => {
        const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
        if (scrollKeys.includes(e.code)) {
          // モーダル内のスクロール可能要素内でのキーボード操作は許可
          const target = e.target as HTMLElement;
          const isInModal = target.closest('.task-merge-modal');
          if (!isInModal) {
            e.preventDefault();
          }
        }
      };
      
      // ホイールスクロールを無効化（モーダル外の場合のみ）
      const preventWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        const isInModal = target.closest('.task-merge-modal');
        if (!isInModal) {
          e.preventDefault();
        }
      };
      
      // タッチスクロールを無効化（モーダル外の場合のみ）
      const preventTouch = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const isInModal = target.closest('.task-merge-modal');
        if (!isInModal) {
          e.preventDefault();
        }
      };
      
      // イベントリスナーを追加
      document.addEventListener('keydown', preventScroll);
      document.addEventListener('wheel', preventWheel, { passive: false });
      document.addEventListener('touchmove', preventTouch, { passive: false });
      
      // クリーンアップ関数
      return () => {
        // スクロール位置を復元
        const scrollY = document.body.style.top;
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        
        // イベントリスナーを削除
        document.removeEventListener('keydown', preventScroll);
        document.removeEventListener('wheel', preventWheel);
        document.removeEventListener('touchmove', preventTouch);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="task-merge-modal-backdrop" onClick={onClose}>
        <div className="task-merge-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="task-merge-header">
            <h2>タスク統合 - {step === 'select-tasks' ? 'ステップ1: 統合するタスクを選択' : 'ステップ2: 統合先の親タスクを選択'}</h2>
            <button className="task-merge-close" onClick={onClose}>×</button>
          </div>

          <div className="task-merge-content">
            {step === 'select-tasks' ? (
              <>
                {/* 親タスクフィルター */}
                <div className="task-merge-section">
                  <h3>親タスクでフィルター</h3>
                  <div className="parent-task-search">
                    {selectedParentFilterId !== null ? (
                      // 選択済みの状態：カード表示
                      <div className="parent-filter-selected-card">
                        <span className="parent-filter-card-text">
                          {selectedParentFilterId === 0 
                            ? 'ルートタスク（親なし）' 
                            : flatTasks.find(t => t.id === selectedParentFilterId)?.title || '不明なタスク'
                          }
                        </span>
                        <button
                          className="parent-filter-card-remove"
                          onClick={() => {
                            setSelectedParentFilterId(null);
                            setParentFilterQuery('');
                          }}
                          title="親タスクフィルターをクリア"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      // 未選択の状態：検索入力
                      <>
                        <input
                          type="text"
                          placeholder="親タスクを検索してフィルター..."
                          value={parentFilterQuery}
                          onChange={(e) => setParentFilterQuery(e.target.value)}
                          className="parent-task-search-input"
                        />
                        {parentFilterQuery && (
                          <div className="parent-task-suggestions">
                            <div
                              className="parent-task-suggestion"
                              onClick={() => {
                                setSelectedParentFilterId(0);
                                setParentFilterQuery('');
                              }}
                            >
                              ルートタスク（親なし）
                            </div>
                            {flatTasks
                              .filter(task => 
                                task.title.toLowerCase().includes(parentFilterQuery.toLowerCase())
                              )
                              .slice(0, 5)
                              .map(task => (
                                <div
                                  key={task.id}
                                  className="parent-task-suggestion"
                                  onClick={() => {
                                    setSelectedParentFilterId(task.id);
                                    setParentFilterQuery('');
                                  }}
                                >
                                  {task.title}
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* タスク検索とフィルター */}
                <div className="task-merge-section">
                  <h3>統合するタスクを選択</h3>
                  
                  {/* 検索とフィルター */}
                  <div className="task-merge-search">
                    <input
                      type="text"
                      placeholder="タスクを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="task-merge-search-input"
                    />
                    <button
                      ref={filterButtonRef}
                      className={`search-filter-icon ${hasActiveFilters ? 'has-filters' : ''} ${showFilterModal ? 'active' : ''}`}
                      onClick={() => setShowFilterModal(!showFilterModal)}
                      title={hasActiveFilters ? "フィルター適用中" : "フィルター"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                      </svg>
                    </button>
                    <label className="task-merge-select-all">
                      <input
                        type="checkbox"
                        checked={(() => {
                          const filteredTaskIds = filteredTasks.map(task => task.id);
                          const currentSelectedFromFiltered = Array.from(selectedTasks).filter(id => 
                            filteredTaskIds.includes(id)
                          );
                          return currentSelectedFromFiltered.length === filteredTasks.length && filteredTasks.length > 0;
                        })()}
                        onChange={toggleAllTasks}
                        className="task-merge-select-all-checkbox"
                      />
                      <span>全選択</span>
                    </label>
                  </div>
                </div>

                {/* タスクリスト */}
                <div className="task-merge-task-list">
                  {filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className={`task-merge-task-item ${selectedTasks.has(task.id) ? 'selected' : ''}`}
                      onClick={() => toggleTaskSelection(task.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="task-merge-checkbox radio-style"
                      />
                      <div className="task-merge-task-info">
                        <div className="task-merge-task-title">{task.title}</div>
                        {task.description && (
                          <div className="task-merge-task-description">{task.description}</div>
                        )}
                        <div className="task-merge-task-meta">
                          <span className={`status ${task.status}`}>{TASK_STATUS_LABELS[task.status]}</span>
                          <span className={`priority ${task.priority}`}>{TASK_PRIORITY_LABELS[task.priority]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* ステップ2: 親タスク選択 */}
                <div className="task-merge-section">
                  <h3>選択されたタスク（{selectedTasks.size}個）</h3>
                  <div className="task-merge-selected-tasks">
                    {Array.from(selectedTasks).map(taskId => {
                      const task = flatTasks.find(t => t.id === taskId);
                      return task ? (
                        <div key={task.id} className="task-merge-selected-task">
                          <span className="task-merge-selected-task-title">{task.title}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="task-merge-section">
                  <h3>統合先の親タスクを選択</h3>
                  
                  {/* 検索とフィルター */}
                  <div className="task-merge-search">
                    <input
                      type="text"
                      placeholder="親タスクを検索..."
                      value={parentSearchQuery}
                      onChange={(e) => setParentSearchQuery(e.target.value)}
                      className="task-merge-search-input"
                    />
                    <button
                      ref={parentFilterButtonRef}
                      className={`search-filter-icon ${(parentSelectedStatuses.length > 0 || parentSelectedPriorities.length > 0 || parentSelectedTagIds.length > 0 || parentDateFilterFrom || parentDateFilterTo) ? 'has-filters' : ''} ${showParentFilterModal ? 'active' : ''}`}
                      onClick={() => setShowParentFilterModal(!showParentFilterModal)}
                      title="フィルター"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="task-merge-task-list">
                    {/* ゴミ箱オプション */}
                    <div
                      className={`task-merge-task-item delete-option ${targetParentId === 'delete' ? 'selected' : ''}`}
                      onClick={() => setTargetParentId('delete')}
                    >
                      <input
                        type="radio"
                        checked={targetParentId === 'delete'}
                        onChange={() => setTargetParentId('delete')}
                        className="task-merge-radio"
                        name="parentTask"
                      />
                      <div className="task-merge-task-info">
                        <div className="task-merge-task-title">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                          ゴミ箱
                        </div>
                        <div className="task-merge-task-description delete-warning">選択されたタスクを削除します（元に戻せません）</div>
                      </div>
                    </div>
                    
                    <div
                      className={`task-merge-task-item ${!targetParentId ? 'selected' : ''}`}
                      onClick={() => setTargetParentId(undefined)}
                    >
                      <input
                        type="radio"
                        checked={!targetParentId}
                        onChange={() => setTargetParentId(undefined)}
                        className="task-merge-radio"
                        name="parentTask"
                      />
                      <div className="task-merge-task-info">
                        <div className="task-merge-task-title">なし（ルートタスク）</div>
                        <div className="task-merge-task-description">タスクをトップレベルに配置します</div>
                      </div>
                    </div>
                    {mergeAvailableParentTasks.map(task => (
                      <div
                        key={task.id}
                        className={`task-merge-task-item ${task.id === targetParentId ? 'selected' : ''}`}
                        onClick={() => setTargetParentId(task.id)}
                      >
                        <input
                          type="radio"
                          checked={task.id === targetParentId}
                          onChange={() => setTargetParentId(task.id)}
                          className="task-merge-radio"
                          name="parentTask"
                        />
                        <div className="task-merge-task-info">
                          <div className="task-merge-task-title">{task.title}</div>
                          {task.description && (
                            <div className="task-merge-task-description">{task.description}</div>
                          )}
                          <div className="task-merge-task-meta">
                            <span className={`status ${task.status}`}>{TASK_STATUS_LABELS[task.status]}</span>
                            <span className={`priority ${task.priority}`}>{TASK_PRIORITY_LABELS[task.priority]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="task-merge-actions">
            <button className="task-merge-cancel" onClick={onClose}>
              キャンセル
            </button>
            {step === 'select-tasks' ? (
              <button 
                className="task-merge-next"
                onClick={() => setStep('select-parent')}
                disabled={selectedTasks.size === 0}
              >
                次へ（{selectedTasks.size}個のタスク選択済み）
              </button>
            ) : (
              <>
                <button 
                  className="task-merge-back"
                  onClick={() => setStep('select-tasks')}
                >
                  戻る
                </button>
                <button 
                  className={`task-merge-execute ${targetParentId === 'delete' ? 'delete-execute' : ''}`}
                  onClick={handleMerge}
                >
                  {targetParentId === 'delete' ? '削除実行' : '統合実行'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* フィルターモーダル - TaskMergeModalの外側に配置 */}
      {isOpen && (
        <div className="task-merge-filter-modal">
          <NotionLikeFilterModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            triggerRef={filterButtonRef}
            selectedStatuses={selectedStatuses}
            onStatusChange={setSelectedStatuses}
            selectedPriorities={selectedPriorities}
            onPriorityChange={setSelectedPriorities}
            selectedTagIds={selectedTagIds}
            onTagChange={setSelectedTagIds}
            allTags={tags}
            dateFilterFrom={dateFilterFrom}
            dateFilterTo={dateFilterTo}
            onDateFromChange={setDateFilterFrom}
            onDateToChange={setDateFilterTo}
            includeParentTasks={includeParentTasks}
            onIncludeParentTasksChange={setIncludeParentTasks}
            maintainHierarchy={maintainHierarchy}
            onMaintainHierarchyChange={setMaintainHierarchy}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}
      
      {/* ステップ2用フィルターモーダル */}
      {isOpen && step === 'select-parent' && (
        <div className="task-merge-filter-modal">
          <NotionLikeFilterModal
            isOpen={showParentFilterModal}
            onClose={() => setShowParentFilterModal(false)}
            triggerRef={parentFilterButtonRef}
            selectedStatuses={parentSelectedStatuses}
            onStatusChange={setParentSelectedStatuses}
            selectedPriorities={parentSelectedPriorities}
            onPriorityChange={setParentSelectedPriorities}
            selectedTagIds={parentSelectedTagIds}
            onTagChange={setParentSelectedTagIds}
            allTags={tags}
            dateFilterFrom={parentDateFilterFrom}
            dateFilterTo={parentDateFilterTo}
            onDateFromChange={setParentDateFilterFrom}
            onDateToChange={setParentDateFilterTo}
            includeParentTasks={true}
            onIncludeParentTasksChange={() => {}}
            maintainHierarchy={false}
            onMaintainHierarchyChange={() => {}}
            onClearFilters={() => {
              setParentSearchQuery('');
              setParentSelectedStatuses([]);
              setParentSelectedPriorities([]);
              setParentSelectedTagIds([]);
              setParentDateFilterFrom('');
              setParentDateFilterTo('');
            }}
          />
        </div>
      )}
    </>
  );
};

export default TaskMergeModal;