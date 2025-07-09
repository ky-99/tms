import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { useTaskContext } from '../contexts/TaskContext';
import { flattenTasks } from '../utils/taskUtils';

interface TaskMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
}

const TaskMergeModal: React.FC<TaskMergeModalProps> = ({ isOpen, onClose, allTasks }) => {
  const { updateTask, loadTasks } = useTaskContext();
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [targetParentId, setTargetParentId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isParentSelectorOpen, setIsParentSelectorOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const parentSelectorRef = useRef<HTMLDivElement>(null);

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

  // フラット化されたタスクリスト
  const flatTasks = flattenTasks(allTasks);
  
  // 検索フィルタ適用
  const filteredTasks = flatTasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 親タスクとして選択可能なタスク（選択されたタスクとその子孫を除外）
  const availableParentTasks = flatTasks.filter(task => {
    if (selectedTasks.has(task.id)) return false;
    // 選択されたタスクの子孫も除外
    for (const selectedId of selectedTasks) {
      if (isDescendantOf(task.id, selectedId, allTasks)) return false;
    }
    return true;
  });

  const selectedParentTask = availableParentTasks.find(task => task.id === targetParentId);

  // ステータスと優先度の日本語変換
  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': '未着手',
      'in_progress': '進行中',
      'completed': '完了',
      'cancelled': 'キャンセル'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string): string => {
    const priorityMap: { [key: string]: string } = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '緊急'
    };
    return priorityMap[priority] || priority;
  };

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

  // 全タスクの選択/解除
  const toggleAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)));
    }
  };

  // 統合実行
  const handleMerge = async () => {
    if (selectedTasks.size === 0) {
      alert('統合するタスクを選択してください');
      return;
    }

    console.log('Starting task merge:', {
      selectedTasks: Array.from(selectedTasks),
      targetParentId,
      totalTasks: selectedTasks.size
    });

    try {
      // 選択されたタスクの親を変更
      const updatePromises = Array.from(selectedTasks).map(async (taskId) => {
        console.log(`Updating task ${taskId} with parentId: ${targetParentId}`);
        // undefinedをnullに変換してバックエンドに送信
        const parentIdValue = targetParentId === undefined ? null : targetParentId;
        const result = await updateTask(taskId, { parentId: parentIdValue as any });
        console.log(`Task ${taskId} updated successfully:`, result);
        return result;
      });
      
      const results = await Promise.all(updatePromises);
      console.log('All tasks updated successfully:', results);
      
      // タスクリストを更新
      await loadTasks();
      console.log('Task list refreshed after merge');
      
      // 成功後にモーダルを閉じる
      onClose();
      setSelectedTasks(new Set());
      setTargetParentId(undefined);
      setSearchQuery('');
      
      alert(`${selectedTasks.size}個のタスクを統合しました`);
    } catch (error) {
      console.error('Failed to merge tasks:', error);
      alert('タスクの統合に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  };

  // 外側クリックで親セレクターを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (parentSelectorRef.current && !parentSelectorRef.current.contains(event.target as Node)) {
        setIsParentSelectorOpen(false);
      }
    };

    if (isParentSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isParentSelectorOpen]);

  // モーダルが閉じられた時のクリーンアップ
  useEffect(() => {
    if (!isOpen) {
      setSelectedTasks(new Set());
      setTargetParentId(undefined);
      setSearchQuery('');
      setIsParentSelectorOpen(false);
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
    <div className="task-merge-modal-backdrop" onClick={onClose}>
      <div className="task-merge-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="task-merge-header">
          <h2>タスク統合</h2>
          <button className="task-merge-close" onClick={onClose}>×</button>
        </div>

        <div className="task-merge-content">
          {/* 親タスク選択 */}
          <div className="task-merge-section">
            <h3>統合先の親タスク</h3>
            <div className="task-merge-parent-selector" ref={parentSelectorRef}>
              <div 
                className="task-merge-parent-input"
                onClick={() => setIsParentSelectorOpen(!isParentSelectorOpen)}
              >
                <span className="task-merge-parent-value">
                  {selectedParentTask ? selectedParentTask.title : 'なし（ルートタスク）'}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="task-merge-parent-arrow">
                  <path d={isParentSelectorOpen ? "M7 14l5-5 5 5z" : "M7 10l5 5 5-5z"}/>
                </svg>
              </div>
              
              {isParentSelectorOpen && (
                <div className="task-merge-parent-dropdown">
                  <div
                    className={`task-merge-parent-option ${!targetParentId ? 'selected' : ''}`}
                    onClick={() => {
                      setTargetParentId(undefined);
                      setIsParentSelectorOpen(false);
                    }}
                  >
                    なし（ルートタスク）
                  </div>
                  
                  {availableParentTasks.map(task => (
                    <div
                      key={task.id}
                      className={`task-merge-parent-option ${task.id === targetParentId ? 'selected' : ''}`}
                      onClick={() => {
                        setTargetParentId(task.id);
                        setIsParentSelectorOpen(false);
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* タスク検索 */}
          <div className="task-merge-section">
            <h3>統合するタスクを選択</h3>
            <div className="task-merge-search">
              <input
                type="text"
                placeholder="タスクを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="task-merge-search-input"
              />
              <button
                className="task-merge-select-all"
                onClick={toggleAllTasks}
              >
                {selectedTasks.size === filteredTasks.length ? '全解除' : '全選択'}
              </button>
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
                  className="task-merge-checkbox"
                />
                <div className="task-merge-task-info">
                  <div className="task-merge-task-title">{task.title}</div>
                  {task.description && (
                    <div className="task-merge-task-description">{task.description}</div>
                  )}
                  <div className="task-merge-task-meta">
                    <span className={`status ${task.status}`}>{getStatusText(task.status)}</span>
                    <span className={`priority ${task.priority}`}>{getPriorityText(task.priority)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="task-merge-actions">
          <button className="task-merge-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button 
            className="task-merge-execute"
            onClick={handleMerge}
            disabled={selectedTasks.size === 0}
          >
            統合実行（{selectedTasks.size}個のタスク）
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskMergeModal;