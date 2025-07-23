import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  DndContext, 
  DragEndEvent,
  DragStartEvent,
  useDraggable, 
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { Task } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks/useAlert';
import { getTaskEndDateTime, getTaskStartDateTime, getStatusColor, getPriorityColor } from '../../utils/taskUtils';
import { combineDateAndTime } from '../../utils/lightDateUtils';
import '../../styles/calendar-view.css';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (endDate: string) => void;
  onUpdateTask?: (taskId: number, updates: Partial<Task>) => Promise<void>;
  currentDate?: Date;
  hideNavigation?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  tasks, 
  onTaskClick, 
  onCreateTask, 
  onUpdateTask,
  currentDate: externalCurrentDate, 
  hideNavigation = false 
}) => {
  const [currentDate, setCurrentDate] = useState(externalCurrentDate || new Date());
  
  // ドラッグアンドドロップの状態管理
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  // ドラッグセンサーの設定
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });

  const sensors = useSensors(mouseSensor, touchSensor);
  
  // 外部から渡された日付を同期
  useEffect(() => {
    if (externalCurrentDate) {
      setCurrentDate(externalCurrentDate);
    }
  }, [externalCurrentDate]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { setCurrentContext, setHoveredCalendarTaskId } = useShortcut();
  
  // 月の最初と最後の日を取得
  const firstDay = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);
  
  const lastDay = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return date;
  }, [currentDate]);
  
  // カレンダーグリッドの日付を生成（固定6週間 = 42日）
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDay.getDay());
    
    // 常に6週間（42日）を表示
    const current = new Date(startDay);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [firstDay]);
  
  // 日付ごとのタスクをグループ化（新スキーマ対応）
  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      const endDateTime = getTaskEndDateTime(task);
      if (endDateTime) {
        // ISO 8601形式の日付キーに統一
        const year = endDateTime.getFullYear();
        const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(endDateTime.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);
  
  // 前月へ
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };
  
  // 次月へ
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };
  
  // 今日に戻る
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // タスクをクリックして詳細に移動
  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      setLocation(`/tasks/${task.id}`);
    }
  };

  // 日付の展開・折りたたみを切り替える
  const toggleDateExpansion = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  // カレンダーコンテキストを設定
  useEffect(() => {
    setCurrentContext('calendar');
    return () => {
      setCurrentContext('global');
    };
  }, [setCurrentContext]);

  // Cmd+Nキーでホバー日付のタスクを作成
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCmd = event.metaKey || event.ctrlKey;
      if (isCmd && event.key.toLowerCase() === 'n' && !event.shiftKey && hoveredDate && onCreateTask) {
        event.preventDefault();
        event.stopPropagation();
        onCreateTask(hoveredDate);
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [hoveredDate, onCreateTask]);

  // createTaskWithDateイベントを監視
  useEffect(() => {
    const handleCreateTaskWithDate = (event: CustomEvent) => {
      if (event.detail?.date && onCreateTask) {
        onCreateTask(event.detail.date);
      }
    };

    window.addEventListener('createTaskWithDate', handleCreateTaskWithDate as EventListener);
    return () => {
      window.removeEventListener('createTaskWithDate', handleCreateTaskWithDate as EventListener);
    };
  }, [onCreateTask]);
  

  // ドラッグ開始イベント
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = tasks.find(t => `task-${t.id}` === taskId);
    
    setActiveTaskId(taskId);
    setDraggedTask(task || null);
  };

  // ドラッグ終了イベント
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTaskId(null);
    setDraggedTask(null);
    
    if (!over || !onUpdateTask) {
      return;
    }
    
    // activeからタスクデータを取得
    const taskData = active.data.current;
    const dropData = over.data.current;
    
    if (!taskData || !dropData) {
      return;
    }
    
    // タスクを特定
    let task = taskData.task;
    if (!task) {
      const taskId = parseInt(active.id.toString().replace('task-', ''));
      task = tasks.find(t => t.id === taskId);
    }
    
    if (!task) {
      return;
    }
    
    const dateKey = dropData.dateKey;
    
    // 現在のタスクの開始日と終了日を取得（新スキーマ対応）
    const originalStartTime = getTaskStartDateTime(task);
    const originalEndTime = getTaskEndDateTime(task);
    
    // 新しい日付を作成
    const [year, month, day] = dateKey.split('-').map(Number);
    
    // 現在の終了日と新しい日付を比較（日付のみ）
    if (originalEndTime) {
      const currentDateKey = `${originalEndTime.getFullYear()}-${String(originalEndTime.getMonth() + 1).padStart(2, '0')}-${String(originalEndTime.getDate()).padStart(2, '0')}`;
      
      if (currentDateKey === dateKey) {
        return; // 同じ日付にドロップされた場合は何もしない
      }
    }
    
    try {
      if (originalStartTime && originalEndTime) {
        // 開始日と終了日の両方がある場合：期間を保持して移動
        const duration = originalEndTime.getTime() - originalStartTime.getTime();
        
        // 新しい開始日時（時刻は保持）
        const newStartDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const newStartTime = task.startTime || null;
        
        // 期間を保持して終了日時を計算
        const newStartDateTime = new Date(year, month - 1, day);
        if (task.startTime) {
          const [hours, minutes] = task.startTime.split(':');
          newStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        const newEndDateTime = new Date(newStartDateTime.getTime() + duration);
        
        const newEndDate = `${newEndDateTime.getFullYear()}-${String(newEndDateTime.getMonth() + 1).padStart(2, '0')}-${String(newEndDateTime.getDate()).padStart(2, '0')}`;
        const newEndTime = task.endTime || null;
        
        await onUpdateTask(task.id, {
          startDate: newStartDate,
          startTime: newStartTime,
          endDate: newEndDate,
          endTime: newEndTime
        });
      } else if (originalEndTime) {
        // 終了日のみの場合：終了日を移動
        const newEndDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        await onUpdateTask(task.id, {
          endDate: newEndDate,
          endTime: task.endTime
        });
      }
      
    } catch (error) {
      console.error('Failed to update task date:', error);
    }
  };
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  // ドラッグ可能なタスクコンポーネント
  const DraggableCalendarTask: React.FC<{ task: Task }> = ({ task }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `task-${task.id}`,
      data: { task, taskId: task.id }
    });
    
    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        className={`calendar-task ${isDragging ? 'calendar-task--dragging-active' : ''}`}
        style={{ 
          backgroundColor: task.status === 'completed' ? '#f0fdf4' : '#f9fafb',
          borderLeft: `3px solid ${getStatusColor(task.status)}`,
          opacity: isDragging ? 0 : 1,
          ...style
        }}
        onClick={() => handleTaskClick(task)}
        onMouseEnter={() => setHoveredCalendarTaskId(task.id)}
        onMouseLeave={() => setHoveredCalendarTaskId(null)}
        {...attributes}
        {...listeners}
      >
        <div className="calendar-task-content">
          <span 
            className="calendar-task-priority-dot" 
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          />
          <span className={`calendar-task-title ${task.status === 'completed' ? 'completed' : ''}`}>
            {task.title}
          </span>
        </div>
      </div>
    );
  };

  // ドロップ可能な日付セルコンポーネント
  const DroppableCalendarDay: React.FC<{
    dateKey: string;
    date: Date;
    dayTasks: Task[];
    isToday: boolean;
    isCurrentMonth: boolean;
    expandedDates: Set<string>;
    toggleDateExpansion: (dateKey: string) => void;
    handleCreateTask: () => void;
    onMouseEnter: (dateKey: string) => void;
    onMouseLeave: () => void;
  }> = ({ 
    dateKey, 
    date, 
    dayTasks, 
    isToday, 
    isCurrentMonth, 
    expandedDates, 
    toggleDateExpansion, 
    handleCreateTask,
    onMouseEnter,
    onMouseLeave
  }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: dateKey,
      data: { dateKey },
    });

    return (
      <div
        ref={setNodeRef}
        className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${expandedDates.has(dateKey) ? 'expanded' : ''} ${isOver ? 'calendar-day--drop-target' : ''}`}
        onMouseEnter={() => onMouseEnter(dateKey)}
        onMouseLeave={onMouseLeave}
      >
        <div className="calendar-day-header">
          <span className="calendar-day-number">{date.getDate()}</span>
          {hoveredDate === dateKey && onCreateTask && (
            <button 
              className="calendar-add-task-btn"
              onClick={handleCreateTask}
              title="タスクを作成"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          )}
        </div>
        <div className="calendar-day-tasks">
          {(expandedDates.has(dateKey) ? dayTasks : dayTasks.slice(0, 3)).map((task, _taskIndex) => {
            const isBeingDragged = activeTaskId === `task-${task.id}`;
            
            return isBeingDragged ? (
              <div
                key={task.id}
                className="calendar-task calendar-task--ghost-placeholder"
                style={{ 
                  backgroundColor: task.status === 'completed' ? '#f0fdf4' : '#f9fafb',
                  borderLeft: `3px solid ${getStatusColor(task.status)}`,
                  opacity: 0.3
                }}
              >
                <div className="calendar-task-content">
                  <span 
                    className="calendar-task-priority-dot" 
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  />
                  <span className={`calendar-task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                    {task.title}
                  </span>
                </div>
              </div>
            ) : (
              <DraggableCalendarTask key={task.id} task={task} />
            );
          })}
          {dayTasks.length > 3 && !expandedDates.has(dateKey) && (
            <div 
              className="calendar-more-tasks"
              onClick={(e) => {
                e.stopPropagation();
                toggleDateExpansion(dateKey);
              }}
            >
              +{dayTasks.length - 3} タスク
            </div>
          )}
          {dayTasks.length > 3 && expandedDates.has(dateKey) && (
            <div 
              className="calendar-less-tasks"
              onClick={(e) => {
                e.stopPropagation();
                toggleDateExpansion(dateKey);
              }}
            >
              折りたたむ
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="calendar-view">
        {/* カレンダーヘッダー */}
        {!hideNavigation && (
          <div className="calendar-header">
            <h2 className="calendar-title">
              {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
            </h2>
            <div className="calendar-nav">
              <button className="calendar-nav-button" onClick={goToPreviousMonth}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="today-button" onClick={goToToday}>
                今日
              </button>
              <button className="calendar-nav-button" onClick={goToNextMonth}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* 曜日ヘッダー */}
        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        
        {/* カレンダーグリッド */}
        <div className="calendar-grid">
          {calendarDays.map((date, index) => {
            // 日付キーをISO 8601形式に統一
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            const dayTasks = tasksByDate[dateKey] || [];
            const isToday = date.toDateString() === new Date().toDateString();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            
            const handleCreateTask = () => {
              if (onCreateTask) {
                onCreateTask(dateKey);
              }
            };

            return (
              <DroppableCalendarDay
                key={index}
                dateKey={dateKey}
                date={date}
                dayTasks={dayTasks}
                isToday={isToday}
                isCurrentMonth={isCurrentMonth}
                expandedDates={expandedDates}
                toggleDateExpansion={toggleDateExpansion}
                handleCreateTask={handleCreateTask}
                onMouseEnter={setHoveredDate}
                onMouseLeave={() => setHoveredDate(null)}
              />
            );
          })}
        </div>
      </div>
      
      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        {draggedTask && (
          <div
            className="calendar-task calendar-task--ghost"
            style={{ 
              backgroundColor: draggedTask.status === 'completed' ? '#f0fdf4' : '#f9fafb',
              borderLeft: `3px solid ${getStatusColor(draggedTask.status)}`,
              opacity: 0.9
            }}
          >
            <div className="calendar-task-content">
              <span 
                className="calendar-task-priority-dot" 
                style={{ backgroundColor: getPriorityColor(draggedTask.priority) }}
              />
              <span className={`calendar-task-title ${draggedTask.status === 'completed' ? 'completed' : ''}`}>
                {draggedTask.title}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default React.memo(CalendarView, (prevProps, nextProps) => {
  // 長さが違う場合は即座にfalseを返す（新規タスク作成時など）
  if (prevProps.tasks.length !== nextProps.tasks.length) {
    return false;
  }
  
  // コールバック関数の比較
  if (prevProps.onTaskClick !== nextProps.onTaskClick || 
      prevProps.onCreateTask !== nextProps.onCreateTask) {
    return false;
  }
  
  // タスクの内容を比較（IDでソートしてから比較）
  const prevTasksById = new Map(prevProps.tasks.map(task => [task.id, task]));
  const nextTasksById = new Map(nextProps.tasks.map(task => [task.id, task]));
  
  // IDの集合が異なる場合は更新
  const prevIds = new Set(prevTasksById.keys());
  const nextIds = new Set(nextTasksById.keys());
  if (prevIds.size !== nextIds.size) {
    return false;
  }
  
  // 各タスクの内容を比較
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      return false;
    }
    
    const prevTask = prevTasksById.get(id)!;
    const nextTask = nextTasksById.get(id)!;
    
    if (prevTask.status !== nextTask.status ||
        prevTask.endDate !== nextTask.endDate ||
        prevTask.endTime !== nextTask.endTime ||
        prevTask.startDate !== nextTask.startDate ||
        prevTask.startTime !== nextTask.startTime ||
        prevTask.title !== nextTask.title) {
      return false;
    }
  }
  
  return true;
});