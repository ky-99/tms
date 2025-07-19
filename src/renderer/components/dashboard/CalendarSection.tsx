import React, { useState } from 'react';
import CalendarView from '../calendar/CalendarView';
import TimelineView from './TimelineView';
import { Task } from '../../types';

interface CalendarSectionProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (dueDate: string) => void;
  onUpdateTask?: (taskId: number, updates: Partial<Task>) => Promise<Task>;
}

const CalendarSection: React.FC<CalendarSectionProps> = React.forwardRef<HTMLDivElement, CalendarSectionProps>(({
  tasks,
  onTaskClick,
  onCreateTask,
  onUpdateTask
}, ref) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');

  return (
    <div ref={ref} className="dashboard__section dashboard__section--calendar">
      <div className="dashboard__section-header">
        <h2 className="dashboard__section-title">
          {viewMode === 'calendar' ? 'カレンダー' : 'タイムライン'}
        </h2>
        <div className="dashboard__view-toggle">
          <button
            className={`dashboard__view-toggle-btn ${viewMode === 'calendar' ? 'dashboard__view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
            </svg>
            カレンダー
          </button>
          <button
            className={`dashboard__view-toggle-btn ${viewMode === 'timeline' ? 'dashboard__view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            タイムライン
          </button>
        </div>
      </div>
      
      {viewMode === 'calendar' ? (
        <CalendarView 
          tasks={tasks} 
          onTaskClick={onTaskClick} 
          onCreateTask={onCreateTask} 
        />
      ) : (
        <TimelineView
          tasks={tasks}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
        />
      )}
    </div>
  );
});

CalendarSection.displayName = 'CalendarSection';

export default CalendarSection;