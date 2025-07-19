import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Task } from '../../types';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, getHours, getMinutes, isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import { ja } from 'date-fns/locale';
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
import { adjustTaskTime } from '../../utils/taskValidation';

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask?: (date: string) => void;
  onUpdateTask?: (taskId: number, updates: Partial<Task>) => Promise<Task>;
  currentDate?: Date;
}

const HOUR_HEIGHT = 40; // 1時間あたりの高さ（px）
const TIME_COLUMN_WIDTH = 60; // 時間列の幅
// 各日付列の幅を動的に計算（残りの幅を7日で分割）

// ドラッグ可能なタスクコンポーネント
const DraggableTask: React.FC<{
  task: Task;
  column: number;
  position: { top: number; height: number };
  onTaskClick: (task: Task) => void;
  onTaskResize: (taskId: number, newStartTime: string, newEndTime: string) => void;
}> = ({ task, column, position, onTaskClick, onTaskResize }) => {
  const displayStartTime = task.startDate ? parseISO(task.startDate) : null;
  const displayEndTime = task.endDate ? parseISO(task.endDate) : (task.completedAt ? parseISO(task.completedAt) : null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeMode, setResizeMode] = useState<'top' | 'bottom' | null>(null);
  const [startY, setStartY] = useState(0);
  const [originalStartTime, setOriginalStartTime] = useState<Date | null>(null);
  const [originalEndTime, setOriginalEndTime] = useState<Date | null>(null);
  const [recentlyResized, setRecentlyResized] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task, column, position },
    disabled: isResizing,
  });
  

  const style = transform && !isResizing ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: isDragging ? 'none' : undefined,
  } : undefined;

  const handleMouseDown = (e: React.MouseEvent, mode: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeMode(mode);
    setStartY(e.clientY);
    setOriginalStartTime(displayStartTime);
    setOriginalEndTime(displayEndTime);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeMode || !originalStartTime || !originalEndTime) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.clientY - startY;
    const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60);

    let newStartTime = originalStartTime;
    let newEndTime = originalEndTime;

    if (resizeMode === 'top') {
      newStartTime = new Date(originalStartTime.getTime() + deltaMinutes * 60 * 1000);
      // 開始時間が終了時間を超えないようにする
      if (newStartTime >= originalEndTime) {
        newStartTime = new Date(originalEndTime.getTime() - 15 * 60 * 1000); // 終了時間-15分
      }
    } else if (resizeMode === 'bottom') {
      newEndTime = new Date(originalEndTime.getTime() + deltaMinutes * 60 * 1000);
      // 終了時間が開始時間を下回らないようにする
      if (newEndTime <= originalStartTime) {
        newEndTime = new Date(originalStartTime.getTime() + 15 * 60 * 1000); // 開始時間+15分
      }
    }

    onTaskResize(task.id, newStartTime.toISOString(), newEndTime.toISOString());
  }, [isResizing, resizeMode, originalStartTime, originalEndTime, startY, task.id, onTaskResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeMode(null);
    setRecentlyResized(true);
    
    // 100ms後にクリックを再有効化
    setTimeout(() => {
      setRecentlyResized(false);
    }, 100);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={setNodeRef}
      className={`timeline-task timeline-task--${task.status} timeline-task--priority-${task.priority} ${
        isDragging ? 'timeline-task--dragging' : ''
      } ${
        isResizing ? 'timeline-task--resizing' : ''
      }`}
      style={{
        height: `${position.height}px`,
        opacity: isDragging ? 0.3 : 1,
        ...style,
      }}
      {...attributes}
      {...(isResizing ? {} : listeners)}
      onClick={(e: React.MouseEvent) => {
        if (!isDragging && !isResizing && !recentlyResized) {
          e.stopPropagation();
          onTaskClick(task);
        }
      }}
    >
      {/* リサイズハンドル（上部） */}
      <div
        className="timeline-task-resize-handle timeline-task-resize-handle--top"
        onMouseDown={(e) => handleMouseDown(e, 'top')}
      />
      
      <div className="timeline-task-content">
        <div className="timeline-task-time">
          {displayStartTime && displayEndTime && (
            <>
              {format(displayStartTime, 'HH:mm')} - {format(displayEndTime, 'HH:mm')}
            </>
          )}
          {!displayStartTime && displayEndTime && format(displayEndTime, 'HH:mm')}
        </div>
        <div className="timeline-task-title">{task.title}</div>
      </div>
      
      {/* リサイズハンドル（下部） */}
      <div
        className="timeline-task-resize-handle timeline-task-resize-handle--bottom"
        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
      />
    </div>
  );
};

// ドロップ可能なタイムスロットコンポーネント
const DroppableTimeSlot: React.FC<{
  dayKey: string;
  hour: number;
  quarter: number;
  onCreateTask?: (date: string) => void;
  children: React.ReactNode;
}> = ({ dayKey, hour, quarter, onCreateTask, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${dayKey}-${hour}-${quarter}`,
    data: { dayKey, hour, quarter },
  });
  
  const handleClick = () => {
    if (onCreateTask) {
      const [year, month, day] = dayKey.split('-').map(Number);
      const dateTime = new Date(year, month - 1, day);
      const minutes = quarter * 15;
      dateTime.setHours(hour, minutes, 0, 0);
      onCreateTask(dateTime.toISOString());
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`timeline-grid-cell ${
        isOver ? 'timeline-grid-cell--over' : ''
      }`}
      style={{ 
        height: HOUR_HEIGHT / 4,
        minHeight: HOUR_HEIGHT / 4,
        position: 'relative',
        zIndex: 1,
      }}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};


const TimelineView: React.FC<TimelineViewProps> = ({ 
  tasks, 
  onTaskClick, 
  onCreateTask, 
  onUpdateTask, 
  currentDate = new Date() 
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });
  
  const sensors = useSensors(mouseSensor, touchSensor);
  
  // ドラッグ開始時のハンドラ
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  // ドラッグ終了時のハンドラ
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over || !onUpdateTask) {
      return;
    }
    
    const taskData = active.data.current;
    const dropData = over.data.current;
    
    if (!taskData || !dropData) {
      return;
    }
    
    // taskDataからtaskを取得できない場合は、activeIdからタスクを特定
    let task = taskData.task;
    if (!task) {
      const taskId = parseInt(active.id.toString().replace('task-', ''));
      task = tasks.find(t => t.id === taskId);
    }
    
    if (!task) {
      return;
    }
    
    const { dayKey, hour, quarter } = dropData;
    
    // 新しい時間を計算
    const [year, month, day] = dayKey.split('-').map(Number);
    const newDateTime = new Date(year, month - 1, day);
    const minutes = quarter * 15;
    newDateTime.setHours(hour, minutes, 0, 0);
    
    try {
      // タスクの期間を計算
      const originalStartTime = task.startDate ? parseISO(task.startDate) : null;
      const originalEndTime = task.endDate ? parseISO(task.endDate) : (task.completedAt ? parseISO(task.completedAt) : null);
      
      if (originalStartTime && originalEndTime) {
        const duration = originalEndTime.getTime() - originalStartTime.getTime();
        const newStartTime = newDateTime;
        const newEndTime = new Date(newDateTime.getTime() + duration);
        
        onUpdateTask(task.id, {
          startDate: newStartTime.toISOString(),
          endDate: newEndTime.toISOString(),
        }).catch((error) => {
          console.error('Failed to update task:', error);
        });
      } else if (originalEndTime) {
        onUpdateTask(task.id, {
          endDate: newDateTime.toISOString(),
        }).catch((error) => {
          console.error('Failed to update task:', error);
        });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };
  
  const handleTaskResize = (taskId: number, newStartTime: string, newEndTime: string) => {
    if (!onUpdateTask) return;
    
    // バリデーションを実行し、必要に応じて自動調整
    try {
      const adjusted = adjustTaskTime({
        startDate: newStartTime,
        endDate: newEndTime,
        minimumDurationMinutes: 15
      });
      
      onUpdateTask(taskId, {
        startDate: adjusted.startDate,
        endDate: adjusted.endDate,
      });
    } catch (error) {
      // エラーが発生した場合は何もしない（無効な時間設定）
      console.warn('Invalid time adjustment:', error);
    }
  };
  
  // 週の開始日と終了日を計算
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // 日曜始まり
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // 現在時刻にスクロール
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  // タスクの時間間隔を取得
  const getTaskInterval = useCallback((task: Task) => {
    const dateToUse = task.endDate || task.completedAt;
    if (!dateToUse) return null;
    
    try {
      const endDate = parseISO(dateToUse);
      if (isNaN(endDate.getTime())) {
        console.warn(`Invalid endDate in task ${task.id}: ${dateToUse}`);
        return null;
      }
      
      let startDate = endDate;
      
      if (task.startDate) {
        startDate = parseISO(task.startDate);
        if (isNaN(startDate.getTime())) {
          console.warn(`Invalid startDate in task ${task.id}: ${task.startDate}`);
          startDate = new Date(endDate.getTime() - 30 * 60 * 1000);
        }
      } else {
        // startDateがない場合は30分前を開始時間とする
        startDate = new Date(endDate.getTime() - 30 * 60 * 1000);
      }
      
      return { start: startDate, end: endDate };
    } catch (error) {
      console.warn(`Error parsing dates for task ${task.id}:`, error);
      return null;
    }
  }, []);

  // タスクを日付ごとにグループ化し、重なりを処理
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, { task: Task; column: number }[]> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = [];
    });

    tasks.forEach(task => {
      const dateToUse = task.endDate || task.completedAt;
      if (dateToUse) {
        try {
          const taskDate = parseISO(dateToUse);
          if (isNaN(taskDate.getTime())) {
            console.warn(`Invalid date in task ${task.id}: ${dateToUse}`);
            return;
          }
          const dayKey = format(taskDate, 'yyyy-MM-dd');
        
          // 週内のタスクのみ追加
          if (isWithinInterval(taskDate, { start: weekStart, end: weekEnd })) {
            if (!grouped[dayKey]) {
              grouped[dayKey] = [];
            }
            grouped[dayKey].push({ task, column: 0 });
          }
        } catch (error) {
          console.warn(`Error parsing date for task ${task.id}: ${dateToUse}`, error);
        }
      }
    });

    // 各日のタスクを時間順にソートし、重なりを検出してカラムを割り当て
    Object.keys(grouped).forEach(dayKey => {
      // まず時間順にソート
      grouped[dayKey].sort((a, b) => {
        const aDateStr = a.task.endDate || a.task.completedAt;
        const bDateStr = b.task.endDate || b.task.completedAt;
        const aTime = aDateStr ? parseISO(aDateStr).getTime() : 0;
        const bTime = bDateStr ? parseISO(bDateStr).getTime() : 0;
        return aTime - bTime;
      });

      // 重なりを検出してカラムを割り当て
      grouped[dayKey].forEach((taskItem, index) => {
        const task = taskItem.task;
        const taskInterval = getTaskInterval(task);
        if (!taskInterval) return;

        // 使用可能な最小のカラムを見つける
        let column = 0;
        const columnsInUse: Set<number>[] = [];

        // それ以前のタスクとの重なりをチェック
        for (let i = 0; i < index; i++) {
          const otherTaskItem = grouped[dayKey][i];
          const otherTask = otherTaskItem.task;
          const otherInterval = getTaskInterval(otherTask);
          
          if (otherInterval && areIntervalsOverlapping(taskInterval, otherInterval)) {
            if (!columnsInUse[otherTaskItem.column]) {
              columnsInUse[otherTaskItem.column] = new Set();
            }
            columnsInUse[otherTaskItem.column].add(i);
          }
        }

        // 使用可能な最小のカラムを見つける
        while (columnsInUse[column] && columnsInUse[column].size > 0) {
          column++;
        }

        taskItem.column = column;
      });
    });

    return grouped;
  }, [tasks, weekStart, weekEnd, weekDays, getTaskInterval, JSON.stringify(tasks.map(t => ({id: t.id, startDate: t.startDate, endDate: t.endDate})))]);

  // タスクの位置とサイズを計算
  const getTaskPosition = useCallback((task: Task) => {
    const interval = getTaskInterval(task);
    if (!interval) return null;
    
    const startHours = getHours(interval.start);
    const startMinutes = getMinutes(interval.start);
    const endHours = getHours(interval.end);
    const endMinutes = getMinutes(interval.end);
    
    // 開始位置と高さを計算
    const top = startHours * HOUR_HEIGHT + (startMinutes / 60) * HOUR_HEIGHT;
    const endTop = endHours * HOUR_HEIGHT + (endMinutes / 60) * HOUR_HEIGHT;
    
    // 最小高さは15分（HOUR_HEIGHT / 4）
    const height = Math.max(endTop - top, HOUR_HEIGHT / 4);
    
    return { top, height };
  }, [getTaskInterval]);

  // 現在時刻のライン位置を計算
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // ドラッグ中のタスクを取得
  const activeTask = useMemo(() => {
    if (!activeId) return null;
    const taskId = parseInt(activeId.replace('task-', ''));
    return tasks.find(task => task.id === taskId) || null;
  }, [activeId, tasks]);

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="timeline-view">
      <div className="timeline-header">
        <div className="timeline-corner" style={{ width: TIME_COLUMN_WIDTH }}></div>
        {weekDays.map(day => {
          const dayOfWeek = day.getDay(); // 0=日曜, 6=土曜
          const dayNameColor = dayOfWeek === 0 ? '#dc2626' : dayOfWeek === 6 ? '#2563eb' : '';
          
          return (
            <div 
              key={day.toISOString()} 
              className="timeline-day-header"
              style={{ flex: 1 }}
            >
              <div 
                className="timeline-day-name"
                style={{ color: dayNameColor }}
              >
                {format(day, 'E', { locale: ja })}
              </div>
              <div className="timeline-day-number">{format(day, 'd')}</div>
            </div>
          );
        })}
      </div>
      
      <div className="timeline-body" ref={scrollContainerRef}>
        <div className="timeline-grid">
          {/* 時間軸 */}
          <div className="timeline-times" style={{ width: TIME_COLUMN_WIDTH }}>
            {hours.map(hour => (
              <div key={hour} className="timeline-hour" style={{ height: HOUR_HEIGHT }}>
                <span className="timeline-hour-label">{hour}:00</span>
              </div>
            ))}
          </div>
          
          {/* 各日の列 */}
          {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay[dayKey] || [];
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div 
                key={day.toISOString()} 
                className={`timeline-day-column ${isToday ? 'timeline-day-column--today' : ''}`}
                style={{ flex: 1 }}
              >
                {/* グリッドライン（15分単位） */}
                {hours.map(hour => (
                  <div key={hour} className="timeline-hour-section">
                    {[0, 1, 2, 3].map(quarter => (
                      <DroppableTimeSlot 
                        key={`${hour}-${quarter}`} 
                        dayKey={dayKey}
                        hour={hour}
                        quarter={quarter}
                        onCreateTask={onCreateTask}
                      >
                        <div 
                          className="timeline-grid-cell-inner" 
                          style={{ height: '100%' }}
                        />
                      </DroppableTimeSlot>
                    ))}
                  </div>
                ))}
                
                {/* タスク */}
                {dayTasks.map((taskItem) => {
                  const { task, column } = taskItem;
                  const position = getTaskPosition(task);
                  if (!position) return null;
                  
                  const isBeingDragged = activeId === `task-${task.id}`;
                  
                  return (
                    <div
                      key={task.id}
                      style={{
                        position: 'absolute',
                        top: `${position.top + column * 20}px`,
                        height: `${position.height}px`,
                        left: '4px',
                        right: '4px',
                        zIndex: 20 + column,
                      }}
                    >
                      {isBeingDragged ? (
                        <div
                          className={`timeline-task timeline-task--${task.status} timeline-task--priority-${task.priority} timeline-task--ghost-placeholder`}
                          style={{
                            height: `${position.height}px`,
                            opacity: 0.3,
                          }}
                        >
                          <div className="timeline-task-content">
                            <div className="timeline-task-time">
                              {task.startDate && task.endDate && (
                                <>
                                  {format(parseISO(task.startDate), 'HH:mm')} - {format(parseISO(task.endDate), 'HH:mm')}
                                </>
                              )}
                              {!task.startDate && task.endDate && format(parseISO(task.endDate), 'HH:mm')}
                            </div>
                            <div className="timeline-task-title">{task.title}</div>
                          </div>
                        </div>
                      ) : (
                        <DraggableTask
                          task={task}
                          column={column}
                          position={position}
                          onTaskClick={onTaskClick}
                          onTaskResize={handleTaskResize}
                        />
                      )}
                    </div>
                  );
                })}
                
              </div>
            );
          })}
        </div>
      </div>
    </div>
      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        {activeTask ? (
          <div
            className={`timeline-task timeline-task--${activeTask.status} timeline-task--priority-${activeTask.priority} timeline-task--ghost`}
            style={{
              height: `${getTaskPosition(activeTask)?.height || 60}px`,
              opacity: 0.9,
            }}
          >
            <div className="timeline-task-content">
              <div className="timeline-task-time">
                {activeTask.startDate && activeTask.endDate && (
                  <>
                    {format(parseISO(activeTask.startDate), 'HH:mm')} - {format(parseISO(activeTask.endDate), 'HH:mm')}
                  </>
                )}
                {!activeTask.startDate && activeTask.endDate && format(parseISO(activeTask.endDate), 'HH:mm')}
              </div>
              <div className="timeline-task-title">{activeTask.title}</div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TimelineView;