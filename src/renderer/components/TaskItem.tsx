import React, { useState, useRef } from 'react';
import { Task, Tag } from '../types';
import { getStatusText, getPriorityText, getContrastColor } from '../utils';
import { useTaskContext } from '../contexts/TaskContext';
import StatusPriorityModal from './StatusPriorityModal';
import { isParentTask } from '../utils/taskUtils';

interface TaskItemProps {
  task: Task;
  level: number;
  onTasksChange: () => void;
  onAddSubTask?: (parentId: number) => void;
  onTaskClick?: (taskId: number) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
  onToggleExpand?: (taskId: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, level, onTasksChange, onAddSubTask, onTaskClick, onEditTask, onDeleteTask, onToggleExpand }) => {
  const { updateTask } = useTaskContext();
  const [isClicked, setIsClicked] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagMode, setTagMode] = useState<'select' | 'create'>('select');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#8b5cf6');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  
  // インライン編集用の状態
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isOperationMode, setIsOperationMode] = useState(false);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLSpanElement>(null);


  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(task.id);
    }
  };

  const handleSingleClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // 既存のタイムアウトがあればクリア
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // 前回のクリックから200ms以内なら、ダブルクリックとみなす
    if (timeSinceLastClick < 200 && lastClickTime > 0) {
      // ダブルクリックとして処理
      handleTaskDoubleClick();
      setLastClickTime(0); // リセット
      return;
    }
    
    // シングルクリックとして処理
    setLastClickTime(now);
    
    // 子タスクがある場合のみ展開/折りたたみの遅延処理を設定
    if (hasChildren) {
      const timeout = setTimeout(() => {
        // ダブルクリックが発生していない場合のみ展開/折りたたみ
        if (lastClickTime > 0) {
          toggleExpand();
        }
        setClickTimeout(null);
        setLastClickTime(0); // リセット
      }, 200);
      
      setClickTimeout(timeout);
    } else {
      // 子タスクがない場合は即座にダブルクリック処理
      const timeout = setTimeout(() => {
        if (lastClickTime > 0) {
          handleTaskDoubleClick();
        }
        setClickTimeout(null);
        setLastClickTime(0);
      }, 200);
      
      setClickTimeout(timeout);
    }
  };

  // タイトル編集用のハンドラー
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(task.title);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      try {
        // 楽観的更新：即座にUIを更新
        setOptimisticTitle(editedTitle.trim());
        setIsEditingTitle(false);
        
        await updateTask(task.id, { title: editedTitle.trim() });
        
        // 成功時に楽観的更新をクリア
        setOptimisticTitle(null);
      } catch (error) {
        console.error('Failed to update task title:', error);
        // エラー時は楽観的更新を元に戻す
        setOptimisticTitle(null);
        setEditedTitle(task.title);
        setIsEditingTitle(true);
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleAddSubTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddSubTask) {
      onAddSubTask(task.id);
    }
  };

  const handleTaskDoubleClick = () => {
    // シングルクリックのタイムアウトをキャンセル
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    if (onTaskClick) {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 300);
      
      // 少し遅延を入れてアニメーションを見せる
      setTimeout(() => {
        onTaskClick(task.id);
      }, 100);
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
    if (window.confirm('このタスクを削除しますか？')) {
      try {
        if (onDeleteTask) {
          onDeleteTask(task.id);
        }
        setIsOperationMode(false);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleQuickAddSubTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (onAddSubTask) {
        onAddSubTask(task.id);
      }
      setIsOperationMode(false);
    } catch (error) {
      console.error('Failed to add subtask:', error);
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

  // コンテキストメニュー表示時のスクロール無効化
  React.useEffect(() => {
    if (showContextMenu) {
      // 現在のスクロール位置を保存
      const scrollY = window.scrollY;
      
      // htmlとbodyの両方でスクロールを無効化
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // キーボードによるスクロールを無効化
      const preventScroll = (e: KeyboardEvent) => {
        const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
        if (scrollKeys.includes(e.code)) {
          e.preventDefault();
        }
      };
      
      // ホイールスクロールを無効化
      const preventWheel = (e: WheelEvent) => {
        e.preventDefault();
      };
      
      // タッチスクロールを無効化
      const preventTouch = (e: TouchEvent) => {
        if (e.touches.length > 1) return; // マルチタッチは許可
        e.preventDefault();
      };
      
      document.addEventListener('keydown', preventScroll, { passive: false });
      document.addEventListener('wheel', preventWheel, { passive: false });
      document.addEventListener('touchmove', preventTouch, { passive: false });
      
      return () => {
        // クリーンアップ時にスクロールを復元
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
        
        // イベントリスナーを削除
        document.removeEventListener('keydown', preventScroll);
        document.removeEventListener('wheel', preventWheel);
        document.removeEventListener('touchmove', preventTouch);
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

  // タグエディター表示時のスクロール無効化
  React.useEffect(() => {
    if (showTagEditor) {
      // 現在のスクロール位置を保存
      const scrollY = window.scrollY;
      
      // htmlとbodyの両方でスクロールを無効化
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // キーボードによるスクロールを無効化
      const preventScroll = (e: KeyboardEvent) => {
        const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
        if (scrollKeys.includes(e.code)) {
          e.preventDefault();
        }
      };
      
      // ホイールスクロールを無効化
      const preventWheel = (e: WheelEvent) => {
        e.preventDefault();
      };
      
      // タッチスクロールを無効化
      const preventTouch = (e: TouchEvent) => {
        if (e.touches.length > 1) return; // マルチタッチは許可
        e.preventDefault();
      };
      
      document.addEventListener('keydown', preventScroll, { passive: false });
      document.addEventListener('wheel', preventWheel, { passive: false });
      document.addEventListener('touchmove', preventTouch, { passive: false });
      
      return () => {
        // クリーンアップ時にスクロールを復元
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
        
        // イベントリスナーを削除
        document.removeEventListener('keydown', preventScroll);
        document.removeEventListener('wheel', preventWheel);
        document.removeEventListener('touchmove', preventTouch);
      };
    }
  }, [showTagEditor]);

  // クリックタイムアウトのクリーンアップ
  React.useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  // タスクのタイトルが外部から更新された場合に同期
  React.useEffect(() => {
    setEditedTitle(task.title);
    // 楽観的更新がない場合のみ更新
    if (optimisticTitle === null) {
      setOptimisticTitle(null);
    }
  }, [task.title]);

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
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showTagEditor]);

  const handleEditTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditTask) {
      onEditTask(task);
    }
  };

  const handleDeleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteTask && confirm(`「${task.title}」を削除してもよろしいですか？`)) {
      onDeleteTask(task.id);
    }
  };


  const hasChildren = task.children && task.children.length > 0;
  const isParentInFilter = task.isParentInFilter; // Parent task in filtered view
  const isLeafNode = !hasChildren;
  
  
  const getExpandIcon = () => {
    if (hasChildren) {
      return task.expanded ? '◉' : '◎'; // 二重丸アイコン
    }
    if (isLeafNode) {
      return '○'; // 単純な丸アイコン（葉ノード）
    }
    return '';
  };

  return (
    <>
      <div 
        className={`task-item ${level > 0 ? 'child' : ''} ${isClicked ? 'clicked' : ''} ${isOperationMode ? 'operation-mode' : ''} ${(task.isRoutine || task.is_routine) ? 'routine-task' : ''}`} 
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
        <div className={`task-expand-container ${isLeafNode ? 'leaf-node' : ''}`}>
          <div 
            className={`task-expand ${hasChildren ? 'has-children' : ''} ${isLeafNode ? 'leaf-node' : ''} ${isParentInFilter ? 'parent-in-filter' : ''}`} 
            onClick={isParentInFilter ? undefined : (hasChildren ? toggleExpand : undefined)}
            onDoubleClick={isParentInFilter ? () => onTaskClick?.(task.id) : undefined}
            title={isParentInFilter ? 'ダブルクリックでタスクページに移動' : (hasChildren ? (task.expanded ? '折りたたむ' : '展開する') : '')}
            style={{ cursor: (hasChildren || isParentInFilter) ? 'pointer' : 'default' }}
          >
            {isParentInFilter ? '◎' : getExpandIcon()}
          </div>
        </div>
        
        <div 
          className="task-content"
          onClick={!isEditingTitle && !isEditingStatus && !isEditingPriority && !isOperationMode ? (isParentInFilter ? undefined : handleSingleClick) : undefined}
          onContextMenu={handleContextMenu}
          style={{ 
            cursor: 'pointer'
          }}
        >
          <div className="task-header">
            <span className="task-title">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={(e) => {
                    e.stopPropagation();
                    handleTitleSave();
                  }}
                  onKeyDown={handleTitleKeyDown}
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                  className="task-title-input"
                />
              ) : (
                <span onClick={handleTitleClick} className="task-title-text">
                  {optimisticTitle || task.title}
                </span>
              )}
            </span>
            <span 
              ref={statusRef}
              className={`status ${task.status} ${isParentTask(task) ? 'parent-task-status' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                // 親タスクの場合はステータス編集を無効にする
                if (isParentTask(task)) {
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
              style={{ cursor: isParentTask(task) ? 'default' : 'pointer' }}
              title={isParentTask(task) ? '親タスクのステータスは子タスクから自動計算されます' : undefined}
            >
              {getStatusText(task.status)}
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
              {getPriorityText(task.priority)}
            </span>
          </div>
          
          <div className="task-tags-container">
            {task.tags && task.tags.length > 0 && (
              <div className="task-tags">
                {task.tags.map(tag => {
                  // 背景色の明度を計算してテキスト色を決定
                  const getLuminance = (hexColor: string) => {
                    const rgb = parseInt(hexColor.slice(1), 16);
                    const r = (rgb >> 16) & 0xff;
                    const g = (rgb >> 8) & 0xff;
                    const b = (rgb >> 0) & 0xff;
                    return 0.299 * r + 0.587 * g + 0.114 * b;
                  };
                  
                  const textColor = tag.textColor || tag.text_color || (getLuminance(tag.color) > 128 ? '#000000' : '#ffffff');
                  
                  return (
                    <span 
                      key={tag.id} 
                      className="task-tag" 
                      style={{ 
                        backgroundColor: tag.color,
                        color: textColor
                      }}
                    >
                      {tag.name}
                      <button 
                        className="task-tag-remove" 
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
              className="task-tag-add" 
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
            <div className="task-description">{task.description}</div>
          )}
          
          {!(task.isRoutine || task.is_routine) && (
            <div className="task-timeline">
              <span className="timeline-start">
                {new Date(task.createdAt || task.created_at || Date.now()).toLocaleDateString('ja-JP')}
              </span>
              <span className="timeline-separator">〜</span>
              {task.status === 'completed' && (task.completedAt || task.completed_at) ? (
                <span className="timeline-completed">
                  {new Date(task.completedAt || task.completed_at || Date.now()).toLocaleDateString('ja-JP')} (完了)
                </span>
              ) : (task.dueDate || task.due_date) ? (
                <span className="timeline-end">
                  {new Date(task.dueDate || task.due_date || Date.now()).toLocaleDateString('ja-JP')} (期限)
                </span>
              ) : (
                <span className="timeline-ongoing">
                  進行中
                </span>
              )}
            </div>
          )}
        </div>

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
              className={`operation-btn ${(task.isRoutine || task.is_routine) ? 'routine-active' : 'routine-btn'}`}
              onClick={async (e) => {
                e.stopPropagation();
                const isRoutine = task.isRoutine || task.is_routine;
                await window.taskAPI.updateTask(task.id, { 
                  isRoutine: !isRoutine,
                  routineType: !isRoutine ? 'daily' : null
                });
                onTasksChange();
              }}
              title={(task.isRoutine || task.is_routine) ? 'ルーティンを解除' : 'ルーティンに設定'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
              </svg>
            </button>
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
            onClick={async (e) => {
              e.stopPropagation();
              const isRoutine = task.isRoutine || task.is_routine;
              await window.taskAPI.updateTask(task.id, { 
                isRoutine: !isRoutine,
                routineType: !isRoutine ? 'daily' : null
              });
              onTasksChange();
              closeContextMenu();
            }}
          >
            <span className="context-menu-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
              </svg>
            </span>
            <span>{(task.isRoutine || task.is_routine) ? 'ルーティンを解除' : 'ルーティンに設定'}</span>
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
                                  console.error('タグの削除に失敗しました:', error);
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
                await updateTask(task.id, { status: newStatus as 'pending' | 'in_progress' | 'completed' | 'cancelled' });
              } catch (error) {
                console.error('Failed to update task status:', error);
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
                console.error('Failed to update task priority:', error);
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
              />
              {index < task.children!.length - 1 && <div className="task-divider" style={{ marginLeft: `${(level + 1) * 30}px` }} />}
            </div>
          ))}
        </>
      )}
    </>
  );
};

export default TaskItem;