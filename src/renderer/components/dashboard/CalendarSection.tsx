import React from 'react';
import CalendarView from '../calendar/CalendarView';
import { Task } from '../../types';

interface CalendarSectionProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (dueDate: string) => void;
}

const CalendarSection: React.FC<CalendarSectionProps> = React.forwardRef<HTMLDivElement, CalendarSectionProps>(({
  tasks,
  onTaskClick,
  onCreateTask
}, ref) => {
  return (
    <div ref={ref} className="dashboard__section dashboard__section--calendar">
      <h2 className="dashboard__section-title">カレンダー</h2>
      <CalendarView 
        tasks={tasks} 
        onTaskClick={onTaskClick} 
        onCreateTask={onCreateTask} 
      />
    </div>
  );
});

CalendarSection.displayName = 'CalendarSection';

export default CalendarSection;