import React, { useState } from 'react';
import { Task, Tag } from '../types';
import { getStatusText, getPriorityText, getContrastColor } from '../utils';

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


  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(task.id);
    }
  };

  const handleSingleClick = () => {
    if (!hasChildren) return;
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // 既存のタイムアウトがあればクリア
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // 前回のクリックから300ms以内なら、ダブルクリックとみなす
    if (timeSinceLastClick < 300) {
      // ダブルクリックとして処理
      handleTaskDoubleClick();
      setLastClickTime(0); // リセット
      return;
    }
    
    // シングルクリックとして処理
    setLastClickTime(now);
    
    // ダブルクリックの可能性があるため、少し遅延させる
    const timeout = setTimeout(() => {
      toggleExpand();
      setClickTimeout(null);
      setLastClickTime(0); // リセット
    }, 300);
    
    setClickTimeout(timeout);
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
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  // コンテキストメニュー外クリックで閉じる
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

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
        className={`task-item ${level > 0 ? 'child' : ''} ${isClicked ? 'clicked' : ''}`} 
        style={{ 
          marginLeft: `${level * 30}px`,
          ...(task.isRoutine || task.is_routine ? {
            backgroundColor: '#fff5e6',
            borderColor: '#ffcc80'
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
          onClick={isParentInFilter ? undefined : (hasChildren ? handleSingleClick : undefined)}
          onDoubleClick={isParentInFilter ? () => onTaskClick?.(task.id) : handleTaskDoubleClick}
          onContextMenu={handleContextMenu}
          style={{ 
            cursor: 'pointer'
          }}
        >
          <div className="task-header">
            <span className="task-title">
              {(task.isRoutine || task.is_routine) && (
                <span 
                  style={{ 
                    color: '#3b82f6', 
                    marginRight: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                  title="ルーティンタスク"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
                  </svg>
                </span>
              )}
              {task.title}
            </span>
            <span className={`status ${task.status}`}>
              {getStatusText(task.status)}
            </span>
            <span className={`priority ${task.priority}`}>
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
      
      {hasChildren && task.expanded && task.children!.map(child => (
        <TaskItem
          key={child.id}
          task={child}
          level={level + 1}
          onTasksChange={onTasksChange}
          onAddSubTask={onAddSubTask}
          onTaskClick={onTaskClick}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </>
  );
};

export default TaskItem;