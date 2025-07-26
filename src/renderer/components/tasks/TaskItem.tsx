import React, { useState, useRef } from 'react';
import { Task, Tag } from '../../types';
import { getContrastColor } from '../../utils';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants/task';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks';
import StatusPriorityModal from '../modals/StatusPriorityModal';
import { isParentTask, getTaskDateRange } from '../../utils/taskUtils';

interface TaskItemProps {
  task: Task;
  level: number;
  onTasksChange: () => void;
  onAddSubTask?: (parentId: number) => void;
  onTaskClick?: (taskId: number) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => Promise<void>;
  onToggleExpand?: (taskId: number) => void;
  onTaskSelectForTagging?: (task: Task) => void;
  isDetailView?: boolean; // 子タスクの詳細画面として表示されている場合true
  isExpanded?: boolean;
  isLastChild?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = React.memo(({ task, level, onTasksChange, onAddSubTask, onTaskClick, onEditTask, onDeleteTask, onToggleExpand, onTaskSelectForTagging, isDetailView = false }) => {
  const { updateTask, createTaskAfter } = useTaskContext();
  const { setCurrentContext, setHoveredTask } = useShortcut();
  const { showAlert } = useGlobalAlert();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagMode, setTagMode] = useState<'select' | 'create'>('select');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#8b5cf6');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isOperationMode, setIsOperationMode] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);


  // 選択状態をホバーベースのみに変更
  const isSelected = false; // クリック選択を完全に削除

  // ルーティンタスク切り替え関数（useCallbackでメモ化）
  const handleToggleRoutineWithTaskData = React.useCallback(async (taskData: Task) => {
    const isRoutine = Boolean(taskData.isRoutine);
    
    try {
      await updateTask(taskData.id, { 
        isRoutine: !isRoutine,
        routineType: !isRoutine ? 'daily' : null
      });
    } catch (error) {
    }
    // onTasksChange is not needed since updateTask handles state updates
  }, [updateTask]);

  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(task.id);
    }
  };

  const handleSingleClick = () => {
    // タスクコンテンツ全体のクリックでは何もしない（タイトルクリックのみでナビゲーション）
  };


  // タイトルクリック時のタスク遷移ハンドラー
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTaskClick) {
      onTaskClick(task.id);
    }
  };


  const handleAddSubTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddSubTask) {
      onAddSubTask(task.id);
    }
  };


  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOperationMode(true);
  };

  const handleExitOperationMode = () => {
    setIsOperationMode(false);
  };


  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    showAlert(`タスク「${task.title}」を削除しますか？この操作は元に戻せません。`, {
      type: 'danger',
      title: 'タスクを削除',
      confirmText: '削除',
      cancelText: 'キャンセル',
      showCancel: true,
      onConfirm: async () => {
        try {
          if (onDeleteTask) {
            await onDeleteTask(task.id);
          }
          setIsOperationMode(false);
          showAlert('タスクを削除しました', {
            type: 'success',
            title: '削除完了',
          });
        } catch (error) {
          showAlert('タスクの削除に失敗しました', {
            type: 'error',
            title: 'エラー',
          });
        }
      },
    });
  };

  const handleQuickAddSubTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (onAddSubTask) {
        onAddSubTask(task.id);
      }
      setIsOperationMode(false);
    } catch (error) {
    }
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  // 操作モード外クリックで終了
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOperationMode) {
        setIsOperationMode(false);
      }
      if (showContextMenu) {
        setShowContextMenu(false);
      }
    };

    if (isOperationMode || showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOperationMode, showContextMenu]);

  // コンテキストメニュー表示時のスクロール無効化（軽量化）
  React.useEffect(() => {
    if (showContextMenu) {
      const scrollY = window.scrollY;
      
      // 最小限のスクロール制御
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // スクロール復元
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showContextMenu]);

  // 全タグを取得
  React.useEffect(() => {
    const loadTags = async () => {
      const tags = await window.taskAPI.getAllTags();
      setAllTags(tags);
    };
    if (showTagEditor) {
      loadTags();
    }
  }, [showTagEditor]);

  // タグエディター表示時のスクロール無効化（軽量化）
  React.useEffect(() => {
    if (showTagEditor) {
      const scrollY = window.scrollY;
      
      // 最小限のスクロール制御
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // スクロール復元
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showTagEditor]);



  // タグエディター外クリックで閉じる
  React.useEffect(() => {
    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      // ポップオーバー内のクリックかどうかをチェック
      const popover = document.querySelector('.tag-editor-popover');
      if (popover && popover.contains(target)) {
        // 削除ボタンのクリックの場合はポップオーバーを閉じない
        if (target.classList.contains('tag-editor-remove-hover')) {
          return;
        }
        // その他のポップオーバー内のクリックは通常処理
        return;
      }
      setShowTagEditor(false);
      if (needsRefresh) {
        onTasksChange();
        setNeedsRefresh(false);
      }
    };
    
    if (showTagEditor) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
    
    // showTagEditorがfalseの場合も何らかのreturnが必要
    return () => {};
  }, [showTagEditor, needsRefresh, onTasksChange]);

  // ルーティンタスク切り替えショートカットイベントリスナー
  React.useEffect(() => {
    const handleToggleRoutineEvent = (event: CustomEvent) => {
      if (event.detail && event.detail.task && event.detail.task.id === task.id) {
        // イベントから最新のタスクデータを取得してhandleToggleRoutineに渡す
        const latestTaskData = event.detail.task;
        handleToggleRoutineWithTaskData(latestTaskData);
      }
    };

    window.addEventListener('toggleRoutineTask', handleToggleRoutineEvent as EventListener);
    return () => window.removeEventListener('toggleRoutineTask', handleToggleRoutineEvent as EventListener);
  }, [task.id, handleToggleRoutineWithTaskData]);

  const handleEditTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditTask) {
      onEditTask(task);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 操作モードとコンテキストメニューを即座に閉じる
    setIsOperationMode(false);
    setShowContextMenu(false);
    
    if (onDeleteTask) {
      showAlert(`「${task.title}」を削除してもよろしいですか？この操作は元に戻せません。`, {
        type: 'danger',
        title: '確認',
        onConfirm: async () => {
          await onDeleteTask(task.id);
        }
      });
    }
  };

  const handleToggleRoutine = async () => {
    const isRoutine = Boolean(task.isRoutine);
    
    try {
      await updateTask(task.id, { 
        isRoutine: !isRoutine,
        routineType: !isRoutine ? 'daily' : null
      });
    } catch (error) {
    }
    // onTasksChange is not needed since updateTask handles state updates
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 複製中の場合は複製を禁止
    if (isDuplicating) {
      return;
    }
    
    try {
      setIsDuplicating(true);
      const duplicatedTask: Partial<Task> = {
        title: `${task.title} (コピー)`,
        description: task.description,
        status: 'pending',
        priority: task.priority,
        endDate: task.endDate,
        parentId: task.parentId,
      };
      
      await createTaskAfter(duplicatedTask, task.id);
      setIsOperationMode(false);
      
      // 複製成功トーストを表示
      showAlert(`タスク「${task.title}」を複製しました`, {
        type: 'success',
      });
    } catch (error) {
      // 複製失敗トーストを表示
      showAlert('タスクの複製に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'), {
        type: 'error',
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  // ホバーによる一時的な選択状態の管理
  const handleMouseEnter = () => {
    if (!isOperationMode) {
      setHoveredTask(task);
      setCurrentContext('taskSelected');
    }
  };

  const handleMouseLeave = () => {
    // マウスが離れたときはホバー状態を解除
    if (!isOperationMode) {
      setHoveredTask(null);
      setCurrentContext('global');
    }
  };

  // タスク状態の計算（メモ化）
  const taskInfo = React.useMemo(() => {
    const hasChildren = task.children && task.children.length > 0;
    const isParentInFilter = task.isParentInFilter;
    const isLeafNode = !hasChildren;
    
    const getExpandIcon = () => {
      if (hasChildren) {
        return task.expanded ? '◉' : '◎';
      }
      if (isLeafNode) {
        return '○';
      }
      return '';
    };
    
    return { hasChildren, isParentInFilter, isLeafNode, expandIcon: getExpandIcon() };
  }, [task.children, task.isParentInFilter, task.expanded]);

  const { hasChildren, isParentInFilter, isLeafNode, expandIcon } = taskInfo;

  return (
    <>
      <div
        className={`task-list__item ${level > 0 ? 'task-list__item--child' : ''} ${isOperationMode ? 'task-list__item--operation-mode' : ''} ${task.isRoutine ? 'task-list__item--routine' : ''}`} 
        style={{ 
          marginLeft: `${level * 30}px`,
          ...(isOperationMode ? {
            borderColor: '#3b82f6',
            borderWidth: '2px',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
            background: '#eff6ff'
          } : {})
        }}
        data-task-id={task.id}
      >
        <div className={`task-list__expand-container ${isLeafNode ? 'task-list__expand-container--leaf-node' : ''}`}>
          <div 
            className={`task-list__expand ${hasChildren ? 'task-list__expand--has-children' : ''} ${isLeafNode ? 'task-list__expand--leaf-node' : ''} ${isParentInFilter ? 'task-list__expand--parent-in-filter' : ''}`} 
            onClick={hasChildren ? toggleExpand : undefined}
            title={hasChildren ? (task.expanded ? '折りたたむ' : '展開する') : ''}
            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          >
            {isParentInFilter ? '◎' : expandIcon}
          </div>
        </div>
        
        <div 
          className="task-list__item-content"
          onClick={!isEditingStatus && !isEditingPriority && !isOperationMode ? handleSingleClick : undefined}
          onContextMenu={handleContextMenu}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ 
            cursor: 'pointer'
          }}
        >
          <div className="task-list__header">
            <span className="task-list__title">
              <span onClick={handleTitleClick} className="task-list__title-text">
                {task.title}
              </span>
            </span>
            <span 
              ref={statusRef}
              className={`status ${task.status} ${(isParentTask(task) || task.isParentInFilter) ? 'parent-task-status' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                // 親タスクまたはフィルタ中の親タスクの場合はステータス編集を無効にする
                if (isParentTask(task) || task.isParentInFilter) {
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
              }}
              style={{ cursor: (isParentTask(task) || task.isParentInFilter) ? 'default' : 'pointer' }}
              title={(isParentTask(task) || task.isParentInFilter) ? '親タスクのステータスは子タスクから自動計算されます' : undefined}
            >
              {TASK_STATUS_LABELS[task.status]}
            </span>
            <span 
              ref={priorityRef}
              className={`priority ${task.priority}`}
              onClick={(e) => {
                e.stopPropagation();
                if (priorityRef.current) {
                  const rect = priorityRef.current.getBoundingClientRect();
                  setModalPosition({
                    x: rect.left,
                    y: rect.bottom + 4
                  });
                }
                setIsEditingPriority(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          </div>
          
          <div className="task-list__tags-container">
            {task.tags && task.tags.length > 0 && (
              <div className="task-list__tags">
                {task.tags?.map(tag => {
                  // 色計算の最適化（メモ化）
                  const getTextColor = (tagColor: string, existingTextColor?: string) => {
                    if (existingTextColor) return existingTextColor;
                    
                    const rgb = parseInt(tagColor.slice(1), 16);
                    const r = (rgb >> 16) & 0xff;
                    const g = (rgb >> 8) & 0xff;
                    const b = (rgb >> 0) & 0xff;
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                    return luminance > 128 ? '#000000' : '#ffffff';
                  };
                  
                  const textColor = getTextColor(tag.color, tag.textColor || tag.text_color);
                  
                  return (
                    <span 
                      key={tag.id} 
                      className="task-list__tag"
                      style={{ 
                        backgroundColor: tag.color,
                        color: textColor
                      }}
                    >
                      {tag.name}
                      <button 
                        className="task-list__tag-remove" 
                        onClick={async (e) => {
                          e.stopPropagation();
                          await window.taskAPI.removeTagFromTask(task.id, tag.id);
                          onTasksChange();
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <button 
              className="task-list__tag-add" 
              onClick={(e) => {
                e.stopPropagation();
                setContextMenuPosition({ x: e.clientX, y: e.clientY });
                setShowTagEditor(true);
              }}
            >
              + タグを追加
            </button>
          </div>
          
          {task.description && (
            <div className="task-list__description">{task.description}</div>
          )}
          
          {!task.isRoutine && (
            <div className="task-list__timeline">
              {(() => {
                const dateRangeText = getTaskDateRange(task);
                if (dateRangeText) {
                  return (
                    <span className="timeline-range">
                      {dateRangeText}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>

        {/* 選択インジケーターを削除（ホバーベースに移行） */}

        {/* 操作モード時のクイックアクション */}
        {isOperationMode && (
          <div className="task-operation-actions">
            <button
              className="operation-btn edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleEditTask(e);
                setIsOperationMode(false);
              }}
              title="タスクを編集"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button
              className="operation-btn add-btn"
              onClick={handleQuickAddSubTask}
              title="子タスクを追加"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
            <button
              className={`operation-btn ${(task.isRoutine || task.isRoutine) ? 'routine-active' : 'routine-btn'}`}
              onClick={async (e) => {
                e.stopPropagation();
                await handleToggleRoutine();
              }}
              title={(task.isRoutine || task.isRoutine) ? 'ルーティンを解除' : 'ルーティンに設定'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
              </svg>
            </button>
            {!isDetailView && (
              <button
                className={`operation-btn duplicate-btn ${isDuplicating ? 'duplicating' : ''}`}
                onClick={handleDuplicate}
                disabled={isDuplicating}
                title={isDuplicating ? '複製中...' : 'タスクを複製'}
              >
                {isDuplicating ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="spinning">
                    <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                  </svg>
                )}
              </button>
            )}
            <button
              className="operation-btn delete-btn"
              onClick={handleQuickDelete}
              title="タスクを削除"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
            <button
              className="operation-btn close-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleExitOperationMode();
              }}
              title="操作モードを終了"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {showContextMenu && (
        <>
          <div 
            className="context-menu-overlay" 
            onClick={() => setShowContextMenu(false)}
          />
          <div 
            className="context-menu" 
            style={{
              position: 'fixed',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              zIndex: 10000
            }}
            onClick={e => e.stopPropagation()}
          >
          <button 
            className="context-menu-item" 
            onClick={(e) => {
              e.stopPropagation();
              handleAddSubTask(e);
              closeContextMenu();
            }}
          >
            <span className="context-menu-icon">+</span>
            <span>{isLeafNode ? "子タスクを追加" : "サブタスクを追加"}</span>
          </button>
          <button 
            className="context-menu-item" 
            onClick={(e) => {
              e.stopPropagation();
              handleEditTask(e);
              closeContextMenu();
            }}
          >
            <span className="context-menu-icon">✎</span>
            <span>タスクを編集</span>
          </button>
          <button 
            className="context-menu-item" 
            onClick={(e) => {
              e.stopPropagation();
              if (onTaskSelectForTagging) {
                onTaskSelectForTagging(task);
              }
              closeContextMenu();
            }}
          >
            <span className="context-menu-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.78 12.45,22 13,22C13.55,22 14.05,21.78 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.45 21.78,11.95 21.41,11.58Z"/>
              </svg>
            </span>
            <span>タグを追加</span>
          </button>
          <button 
            className="context-menu-item" 
            onClick={async (e) => {
              e.stopPropagation();
              await handleToggleRoutine();
              closeContextMenu();
            }}
          >
            <span className="context-menu-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
              </svg>
            </span>
            <span>{(task.isRoutine || task.isRoutine) ? 'ルーティンを解除' : 'ルーティンに設定'}</span>
          </button>
          <button 
            className="context-menu-item context-menu-delete" 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTask(e);
              closeContextMenu();
            }}
          >
            <span className="context-menu-icon">×</span>
            <span>タスクを削除</span>
          </button>
          </div>
        </>
      )}
      
      {showTagEditor && (
        <>
          <div className="tag-editor-overlay" />
          <div 
            className="tag-editor-popover" 
            style={{
              position: 'fixed',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              zIndex: 1000
            }}
            onClick={e => e.stopPropagation()}
          >
          <div className="tag-editor-content">
            {tagMode === 'select' && (
              <>
                <div className="tag-editor-header">
                  <h3>タグを選択</h3>
                  <button 
                    className="tag-editor-close"
                    onClick={() => {
                      setShowTagEditor(false);
                      if (needsRefresh) {
                        onTasksChange();
                        setNeedsRefresh(false);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="tag-editor-list">
                  {allTags.filter(tag => !task.tags?.some(t => t.id === tag.id)).map(tag => {
                    const textColor = tag.textColor || tag.text_color || getContrastColor(tag.color);
                    
                    return (
                      <div key={tag.id} className="tag-editor-item-wrapper">
                        <button
                          className="tag-editor-item tag-editor-item-hoverable"
                          onClick={async () => {
                            await window.taskAPI.addTagToTask(task.id, tag.id);
                            setShowTagEditor(false);
                            onTasksChange();
                          }}
                        >
                          <span 
                            className="tag-preview"
                            style={{
                              backgroundColor: tag.color,
                              color: textColor
                            }}
                          >
                            {tag.name}
                            <button 
                              type="button"
                              className="tag-editor-remove-hover"
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                
                                try {
                                  await window.taskAPI.deleteTag(tag.id);
                                  // タグリストをローカルで更新し、needsRefreshフラグを設定
                                  const tags = await window.taskAPI.getAllTags();
                                  setAllTags(tags);
                                  setNeedsRefresh(true);
                                } catch (error) {
                                }
                              }}
                              title="タグを削除"
                            >
                              ×
                            </button>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button 
                  className="tag-editor-create"
                  onClick={() => setTagMode('create')}
                >
                  + 新しいタグを作成
                </button>
              </>
            )}
            
            {tagMode === 'create' && (
              <>
                <div className="tag-editor-header">
                  <h3>新しいタグを作成</h3>
                  <button 
                    className="tag-editor-back"
                    onClick={() => {
                      setTagMode('select');
                      setNewTagName('');
                      setNewTagColor('#8b5cf6');
                    }}
                  >
                    ←
                  </button>
                </div>
                <div className="tag-editor-form">
                  <input
                    type="text"
                    placeholder="タグ名"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="tag-editor-input"
                    autoFocus
                  />
                  <div className="tag-color-selector">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="tag-color-input"
                    />
                    <div className="tag-color-presets">
                      {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1', '#84cc16'].map(color => (
                        <button
                          key={color}
                          className="tag-color-preset"
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    className="tag-editor-save"
                    onClick={async () => {
                      if (newTagName.trim()) {
                        const textColor = getContrastColor(newTagColor);
                        const newTag = await window.taskAPI.createTag(newTagName, newTagColor, textColor);
                        await window.taskAPI.addTagToTask(task.id, newTag.id);
                        setShowTagEditor(false);
                        onTasksChange();
                      }
                    }}
                    disabled={!newTagName.trim()}
                  >
                    作成
                  </button>
                </div>
              </>
            )}
            
          </div>
        </div>
        </>
      )}
      
      {/* ステータス編集モーダル */}
      {isEditingStatus && (
        <StatusPriorityModal
          type="status"
          currentValue={task.status}
          onSelect={async (newStatus: string) => {
            setIsEditingStatus(false);
            if (newStatus !== task.status) {
              try {
                await updateTask(task.id, { status: newStatus as 'pending' | 'in_progress' | 'completed' });
              } catch (error) {
                setIsEditingStatus(true);
              }
            }
          }}
          onClose={() => setIsEditingStatus(false)}
          position={modalPosition}
        />
      )}
      
      {/* 優先度編集モーダル */}
      {isEditingPriority && (
        <StatusPriorityModal
          type="priority"
          currentValue={task.priority}
          onSelect={async (newPriority: string) => {
            setIsEditingPriority(false);
            if (newPriority !== task.priority) {
              try {
                await updateTask(task.id, { priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' });
              } catch (error) {
                setIsEditingPriority(true);
              }
            }
          }}
          onClose={() => setIsEditingPriority(false)}
          position={modalPosition}
        />
      )}
      
      {hasChildren && task.expanded && (
        <>
          <div className="task-divider" style={{ marginLeft: `${(level + 1) * 30}px` }} />
          {task.children!.map((child, index) => (
            <div key={child.id}>
              <TaskItem
                task={child}
                level={level + 1}
                onTasksChange={onTasksChange}
                onAddSubTask={onAddSubTask}
                onTaskClick={onTaskClick}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleExpand={onToggleExpand}
                isDetailView={isDetailView}
              />
              {index < task.children!.length - 1 && <div className="task-divider" style={{ marginLeft: `${(level + 1) * 30}px` }} />}
            </div>
          ))}
        </>
      )}
    </>
  );
});

export default React.memo(TaskItem, (prevProps, nextProps) => {
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;
  
  return (
    prevTask.id === nextTask.id &&
    prevTask.title === nextTask.title &&
    prevTask.status === nextTask.status &&
    prevTask.priority === nextTask.priority &&
    prevTask.description === nextTask.description &&
    prevTask.endDate === nextTask.endDate &&
    prevTask.isRoutine === nextTask.isRoutine &&
    prevTask.children?.length === nextTask.children?.length &&
    prevProps.level === nextProps.level &&
    prevProps.onTaskClick === nextProps.onTaskClick &&
    prevProps.onEditTask === nextProps.onEditTask &&
    prevProps.onDeleteTask === nextProps.onDeleteTask &&
    prevProps.onToggleExpand === nextProps.onToggleExpand &&
    prevProps.onTasksChange === nextProps.onTasksChange
  );
});