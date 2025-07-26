import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Task } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks/useAlert';
import { getTaskEndDateTime, getTaskStartDateTime, getStatusColor, getPriorityColor } from '../../utils/taskUtils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CalendarViewProps {
  tasks: Task[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  onCreateTask?: (date: string) => void;
  viewType?: 'month' | 'week';
}

const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  currentDate,
  onDateChange,
  onTaskClick,
  onCreateTask,
  viewType = 'month'
}) => {
  const [, setLocation] = useLocation();
  const { setCurrentContext, setHoveredCalendarTaskId } = useShortcut();
  const { showAlert } = useGlobalAlert();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Set context for shortcuts
  React.useEffect(() => {
    setCurrentContext('calendar');
  }, [setCurrentContext]);

  // Calendar navigation
  const goToPreviousMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    if (viewType === 'week') {
      // 週表示：選択された日を含む週の7日間
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // 月表示：月の最初から6週間(42日)
      const monthStart = startOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      
      // Calculate exactly 6 weeks (42 days) from start
      const calendarEnd = new Date(calendarStart);
      calendarEnd.setDate(calendarEnd.getDate() + 41); // 42 days total (0-41 = 42 days)
      
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [currentDate, viewType]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      const endDate = getTaskEndDateTime(task);
      if (endDate) {
        const dateKey = format(endDate, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  // Handle day click for task creation
  const handleDayClick = (date: Date) => {
    if (onCreateTask) {
      onCreateTask(format(date, 'yyyy-MM-dd'));
    }
  };

  // Handle more tasks click
  const handleMoreTasksClick = (dateKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDays(newExpanded);
  };

  return (
    <div className="calendar-view">
      {/* Calendar Grid */}
      <div className={`calendar-grid ${viewType === 'week' ? 'week-view' : 'month-view'}`}>
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];
          const isCurrentMonth = viewType === 'week' ? true : isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const dayOfWeek = day.getDay();
          const isFirstWeek = viewType === 'week' ? true : index < 7; // 週表示では常に曜日を表示
          
          // 曜日の名前を取得
          const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
          const dayName = dayNames[dayOfWeek];
          
          return (
            <div
              key={dateKey}
              className={`calendar-day ${
                !isCurrentMonth ? 'other-month' : ''
              } ${
                isToday ? 'today' : ''
              } ${
                expandedDays.has(dateKey) ? 'expanded' : ''
              }`}
              onClick={() => handleDayClick(day)}
            >
              <div className="calendar-day-header">
                {/* 最初の週だけ曜日を表示 */}
                {isFirstWeek && (
                  <div 
                    className="calendar-day-name"
                    style={{
                      color: dayOfWeek === 0 ? '#dc2626' : dayOfWeek === 6 ? '#2563eb' : '#6b7280'
                    }}
                  >
                    {dayName}
                  </div>
                )}
                <div 
                  className="calendar-day-number"
                  style={{
                    color: !isCurrentMonth ? '#d1d5db' : 
                           dayOfWeek === 0 ? '#dc2626' : 
                           dayOfWeek === 6 ? '#2563eb' : '#374151'
                  }}
                >
                  {format(day, 'd')}
                </div>
              </div>
              
              <div className="calendar-day-tasks">
                {(expandedDays.has(dateKey) ? dayTasks : dayTasks.slice(0, 3)).map(task => (
                  <div
                    key={task.id}
                    className={`calendar-task calendar-task--${task.status}`}
                    onMouseEnter={() => setHoveredCalendarTaskId(task.id)}
                    onMouseLeave={() => setHoveredCalendarTaskId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                  >
                    <div className="calendar-task-content">
                      <div 
                        className="calendar-task-priority-dot"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      />
                      <span className={`calendar-task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                  </div>
                ))}
                
                {dayTasks.length > 3 && (
                  <div 
                    className="calendar-more-tasks"
                    onClick={(e) => handleMoreTasksClick(dateKey, e)}
                  >
                    {expandedDays.has(dateKey) 
                      ? 'すべて閉じる' 
                      : `+${dayTasks.length - 3} more`
                    }
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;