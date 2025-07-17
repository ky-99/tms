import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Task } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useGlobalAlert } from '../../hooks/useAlert';
import '../../styles/calendar-view.css';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (dueDate: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick, onCreateTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  // Removed unused destructuring: deleteTask, showAlert
  const { setCurrentContext, setHoveredCalendarTaskId, setHoveredCalendarDate } = useShortcut();
  
  // 月の最初と最後の日を取得
  const firstDay = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);
  
  const lastDay = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return date;
  }, [currentDate]);
  
  // カレンダーグリッドの日付を生成
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDay.getDay());
    
    const endDay = new Date(lastDay);
    endDay.setDate(endDay.getDate() + (6 - lastDay.getDay()));
    
    const current = new Date(startDay);
    while (current <= endDay) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [firstDay, lastDay]);
  
  // 日付ごとのタスクをグループ化
  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      const dueDateValue = task.dueDate;
      if (dueDateValue) {
        const date = new Date(dueDateValue);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
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
  
  // ステータスに応じた色を取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };
  
  // 優先度に応じたドットカラーを取得
  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  return (
    <div className="calendar-view">
      {/* カレンダーヘッダー */}
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
          const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          const dayTasks = tasksByDate[dateKey] || [];
          const isToday = date.toDateString() === new Date().toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          
          const handleCreateTask = () => {
            if (onCreateTask) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateString = `${year}-${month}-${day}`;
              onCreateTask(dateString);
            }
          };

          return (
            <div
              key={index}
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              onMouseEnter={() => {
                setHoveredDate(dateKey);
                // タスク作成用の日付フォーマットを設定
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                setHoveredCalendarDate(dateString);
              }}
              onMouseLeave={() => {
                setHoveredDate(null);
                setHoveredCalendarDate(null);
              }}
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
                {(expandedDates.has(dateKey) ? dayTasks : dayTasks.slice(0, 3)).map((task, _taskIndex) => (
                  <div
                    key={task.id}
                    className="calendar-task"
                    onClick={() => handleTaskClick(task)}
                    onMouseEnter={() => setHoveredCalendarTaskId(task.id)}
                    onMouseLeave={() => setHoveredCalendarTaskId(null)}
                    style={{ 
                      backgroundColor: task.status === 'completed' ? '#f0fdf4' : '#f9fafb',
                      borderLeft: `3px solid ${getStatusColor(task.status)}`
                    }}
                  >
                    <div className="calendar-task-content">
                      <span 
                        className="calendar-task-priority-dot" 
                        style={{ backgroundColor: getPriorityDot(task.priority) }}
                      />
                      <span className={`calendar-task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                  </div>
                ))}
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
        })}
      </div>
    </div>
  );
};

export default React.memo(CalendarView, (prevProps, nextProps) => {
  return (
    prevProps.tasks.length === nextProps.tasks.length &&
    prevProps.onTaskClick === nextProps.onTaskClick &&
    prevProps.onCreateTask === nextProps.onCreateTask &&
    prevProps.tasks.every((task, index) => {
      const nextTask = nextProps.tasks[index];
      return nextTask && 
        task.id === nextTask.id &&
        task.status === nextTask.status &&
        task.dueDate === nextTask.dueDate;
    })
  );
});