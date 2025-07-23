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
import { getTaskStartDateTime, getTaskEndDateTime } from '../../utils/taskUtils';
import { separateDateAndTime, combineDateAndTime, toLocalDateTimeString } from '../../utils/lightDateUtils';

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

// タスクセグメント情報の型定義
interface TaskSegment {
  task: Task;
  column: number;
  segmentStart: Date;
  segmentEnd: Date;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  totalSegments: number;
  segmentIndex: number;
}

// ドラッグ可能なタスクコンポーネント
const DraggableTask: React.FC<{
  task: Task;
  column: number;
  position: { top: number; height: number };
  onTaskClick: (task: Task) => void;
  onTaskResize: (taskId: number, updates: { startDate?: string | null, startTime?: string | null, endDate?: string | null, endTime?: string | null }) => void;
  segment?: TaskSegment;
}> = ({ task, column, position, onTaskClick, onTaskResize, segment }) => {
  const displayStartTime = getTaskStartDateTime(task);
  const displayEndTime = getTaskEndDateTime(task) || (task.completedAt ? parseISO(task.completedAt) : null);
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

    // 新スキーマ形式で更新（ローカル時刻として保持）
    const startSeparated = separateDateAndTime(toLocalDateTimeString(newStartTime));
    const endSeparated = separateDateAndTime(toLocalDateTimeString(newEndTime));
    
    onTaskResize(task.id, {
      startDate: startSeparated.date,
      startTime: startSeparated.time,
      endDate: endSeparated.date,
      endTime: endSeparated.time
    });
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

  // セグメント用の時間表示を計算
  const getSegmentTimeDisplay = () => {
    if (!segment) {
      // 通常のタスク表示
      if (displayStartTime && displayEndTime) {
        return `${format(displayStartTime, 'HH:mm')} - ${format(displayEndTime, 'HH:mm')}`;
      }
      if (!displayStartTime && displayEndTime) {
        return format(displayEndTime, 'HH:mm');
      }
      return '';
    }

    // セグメントの時間表示（統一されたシンプルな表示）
    const segmentStartTime = format(segment.segmentStart, 'HH:mm');
    const segmentEndTime = format(segment.segmentEnd, 'HH:mm');
    
    if (segment.isFirstSegment) {
      return `${segmentStartTime} -`;
    } else if (segment.isLastSegment) {
      return `- ${segmentEndTime}`;
    } else {
      // 中間セグメントは全日表示
      return '全日';
    }
  };

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
          {getSegmentTimeDisplay()}
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
      onCreateTask(toLocalDateTimeString(dateTime));
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
      // タスクの期間を計算（新スキーマ対応）
      const originalStartTime = getTaskStartDateTime(task);
      const originalEndTime = getTaskEndDateTime(task) || (task.completedAt ? parseISO(task.completedAt) : null);
      
      if (originalStartTime && originalEndTime) {
        const duration = originalEndTime.getTime() - originalStartTime.getTime();
        const newStartTime = newDateTime;
        const newEndTime = new Date(newDateTime.getTime() + duration);
        
        // 新スキーマ形式で更新（ローカル時刻として保持）
        const startSeparated = separateDateAndTime(toLocalDateTimeString(newStartTime));
        const endSeparated = separateDateAndTime(toLocalDateTimeString(newEndTime));
        
        onUpdateTask(task.id, {
          startDate: startSeparated.date || undefined,
          startTime: startSeparated.time || undefined,
          endDate: endSeparated.date || undefined,
          endTime: endSeparated.time || undefined
        }).catch((error) => {
          console.error('Failed to update task:', error);
        });
      } else if (originalEndTime) {
        // 新スキーマ形式で更新（ローカル時刻として保持）
        const endSeparated = separateDateAndTime(toLocalDateTimeString(newDateTime));
        
        onUpdateTask(task.id, {
          endDate: endSeparated.date || undefined,
          endTime: endSeparated.time || undefined
        }).catch((error) => {
          console.error('Failed to update task:', error);
        });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };
  
  const handleTaskResize = (taskId: number, updates: { startDate?: string | null, startTime?: string | null, endDate?: string | null, endTime?: string | null }) => {
    if (!onUpdateTask) return;
    
    // 新スキーマでタスクを更新（null値をundefinedに変換）
    const convertedUpdates = {
      ...updates,
      startDate: updates.startDate || undefined,
      startTime: updates.startTime || undefined,
      endDate: updates.endDate || undefined,
      endTime: updates.endTime || undefined
    };
    onUpdateTask(taskId, convertedUpdates);
  };
  
  // 週の開始日と終了日を計算
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // 日曜始まり
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // タスクを日跨ぎセグメントに分割する関数
  const createTaskSegments = useCallback((task: Task): TaskSegment[] => {
    const startDateTime = getTaskStartDateTime(task);
    const endDateTime = getTaskEndDateTime(task);
    
    if (!startDateTime || !endDateTime) {
      return [];
    }

    const segments: TaskSegment[] = [];
    const taskStart = new Date(Math.max(startDateTime.getTime(), weekStart.getTime()));
    const taskEnd = new Date(Math.min(endDateTime.getTime(), weekEnd.getTime()));

    // 週内にタスクが含まれない場合は空配列を返す
    if (taskStart > weekEnd || taskEnd < weekStart) {
      return [];
    }

    // 日ごとにセグメントを作成
    let currentDate = new Date(taskStart);
    let segmentIndex = 0;

    while (currentDate <= taskEnd) {
      const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);

      const segmentStart = new Date(Math.max(taskStart.getTime(), dayStart.getTime()));
      const segmentEnd = new Date(Math.min(taskEnd.getTime(), dayEnd.getTime()));

      // セグメントが有効な場合のみ追加
      if (segmentStart <= segmentEnd) {
        segments.push({
          task,
          column: 0, // 後で割り当て
          segmentStart,
          segmentEnd,
          isFirstSegment: segmentIndex === 0,
          isLastSegment: false, // 後で更新
          totalSegments: 0, // 後で更新
          segmentIndex
        });
        segmentIndex++;
      }

      // 次の日に移動
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    // 最後のセグメントとトータル数を更新
    if (segments.length > 0) {
      segments[segments.length - 1].isLastSegment = true;
      segments.forEach(segment => {
        segment.totalSegments = segments.length;
      });
    }

    return segments;
  }, [weekStart, weekEnd]);

  // 現在時刻にスクロール
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  // タスクの時間間隔を取得（新スキーマ対応）
  const getTaskInterval = useCallback((task: Task) => {
    const endDateTime = getTaskEndDateTime(task);
    if (!endDateTime) {
      // completedAtをフォールバックとして使用
      if (task.completedAt) {
        try {
          const endDate = parseISO(task.completedAt);
          if (!isNaN(endDate.getTime())) {
            const startDate = new Date(endDate.getTime() - 30 * 60 * 1000);
            return { start: startDate, end: endDate };
          }
        } catch (error) {
          console.warn(`Error parsing completedAt for task ${task.id}:`, error);
        }
      }
      return null;
    }
    
    let startDateTime = getTaskStartDateTime(task);
    if (!startDateTime) {
      // startDateがない場合は30分前を開始時間とする
      startDateTime = new Date(endDateTime.getTime() - 30 * 60 * 1000);
    }
    
    return { start: startDateTime, end: endDateTime };
  }, []);

  // タスクを日付ごとにグループ化し、重なりを処理（セグメント対応）
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, TaskSegment[]> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = [];
    });

    tasks.forEach(task => {
      const segments = createTaskSegments(task);
      
      segments.forEach(segment => {
        const dayKey = format(segment.segmentStart, 'yyyy-MM-dd');
        if (grouped[dayKey]) {
          grouped[dayKey].push(segment);
        }
      });

      // 完了タスクのフォールバック（セグメント化できない場合）
      if (segments.length === 0 && task.completedAt) {
        try {
          const taskDate = parseISO(task.completedAt);
          if (!isNaN(taskDate.getTime())) {
            const dayKey = format(taskDate, 'yyyy-MM-dd');
            
            if (isWithinInterval(taskDate, { start: weekStart, end: weekEnd }) && grouped[dayKey]) {
              // 単一セグメントとして追加
              grouped[dayKey].push({
                task,
                column: 0,
                segmentStart: taskDate,
                segmentEnd: new Date(taskDate.getTime() + 30 * 60 * 1000), // 30分のデフォルト期間
                isFirstSegment: true,
                isLastSegment: true,
                totalSegments: 1,
                segmentIndex: 0
              });
            }
          }
        } catch (error) {
          console.warn(`Error parsing completedAt for task ${task.id}: ${task.completedAt}`, error);
        }
      }
    });

    // 各日のセグメントを時間順にソートし、重なりを検出してカラムを割り当て
    Object.keys(grouped).forEach(dayKey => {
      // セグメント開始時間でソート
      grouped[dayKey].sort((a, b) => {
        return a.segmentStart.getTime() - b.segmentStart.getTime();
      });

      // 重なりを検出してカラムを割り当て
      grouped[dayKey].forEach((segment, index) => {
        const segmentInterval = { start: segment.segmentStart, end: segment.segmentEnd };

        // 使用可能な最小のカラムを見つける
        let column = 0;
        const columnsInUse: Set<number>[] = [];

        // それ以前のセグメントとの重なりをチェック
        for (let i = 0; i < index; i++) {
          const otherSegment = grouped[dayKey][i];
          const otherInterval = { start: otherSegment.segmentStart, end: otherSegment.segmentEnd };
          
          if (areIntervalsOverlapping(segmentInterval, otherInterval)) {
            if (!columnsInUse[otherSegment.column]) {
              columnsInUse[otherSegment.column] = new Set();
            }
            columnsInUse[otherSegment.column].add(i);
          }
        }

        // 使用可能な最小のカラムを見つける
        while (columnsInUse[column] && columnsInUse[column].size > 0) {
          column++;
        }

        segment.column = column;
      });
    });

    return grouped;
  }, [tasks, weekStart, weekEnd, weekDays, createTaskSegments, JSON.stringify(tasks.map(t => ({id: t.id, startDate: t.startDate, startTime: t.startTime, endDate: t.endDate, endTime: t.endTime, completedAt: t.completedAt})))]);

  // タスクの位置とサイズを計算（セグメント対応）
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

  // セグメントの位置とサイズを計算
  const getSegmentPosition = useCallback((segment: TaskSegment) => {
    const startHours = getHours(segment.segmentStart);
    const startMinutes = getMinutes(segment.segmentStart);
    const endHours = getHours(segment.segmentEnd);
    const endMinutes = getMinutes(segment.segmentEnd);
    
    // 開始位置と高さを計算
    const top = startHours * HOUR_HEIGHT + (startMinutes / 60) * HOUR_HEIGHT;
    const endTop = endHours * HOUR_HEIGHT + (endMinutes / 60) * HOUR_HEIGHT;
    
    // 最小高さは15分（HOUR_HEIGHT / 4）
    const height = Math.max(endTop - top, HOUR_HEIGHT / 4);
    
    return { top, height };
  }, []);


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
                
                {/* セグメント */}
                {dayTasks.map((segment, index) => {
                  const position = getSegmentPosition(segment);
                  if (!position) return null;
                  
                  const isBeingDragged = activeId === `task-${segment.task.id}`;
                  const uniqueKey = `${segment.task.id}-${segment.segmentIndex}`;
                  
                  return (
                    <div
                      key={uniqueKey}
                      style={{
                        position: 'absolute',
                        top: `${position.top + segment.column * 20}px`,
                        height: `${position.height}px`,
                        left: '4px',
                        right: '4px',
                        zIndex: 20 + segment.column,
                      }}
                    >
                      {isBeingDragged ? (
                        <div
                          className={`timeline-task timeline-task--${segment.task.status} timeline-task--priority-${segment.task.priority} timeline-task--ghost-placeholder`}
                          style={{
                            height: `${position.height}px`,
                            opacity: 0.3,
                          }}
                        >
                          <div className="timeline-task-content">
                            <div className="timeline-task-time">
                              {(() => {
                                if (segment.isFirstSegment) {
                                  return `${format(segment.segmentStart, 'HH:mm')} -`;
                                } else if (segment.isLastSegment) {
                                  return `- ${format(segment.segmentEnd, 'HH:mm')}`;
                                } else {
                                  return '全日';
                                }
                              })()} 
                            </div>
                            <div className="timeline-task-title">{segment.task.title}</div>
                          </div>
                        </div>
                      ) : (
                        <DraggableTask
                          task={segment.task}
                          column={segment.column}
                          position={position}
                          onTaskClick={onTaskClick}
                          onTaskResize={handleTaskResize}
                          segment={segment}
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
                {(() => {
                  const startTime = getTaskStartDateTime(activeTask);
                  const endTime = getTaskEndDateTime(activeTask);
                  if (startTime && endTime) {
                    return `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
                  } else if (endTime) {
                    return format(endTime, 'HH:mm');
                  }
                  return '';
                })()} 
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