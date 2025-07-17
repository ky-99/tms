import React from 'react';
import TaskCard from '../tasks/TaskCard';
import { Task } from '../../types';

interface TodayTasksSectionProps {
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onTaskClick: (task: Task) => void;
}

const TodayTasksSection: React.FC<TodayTasksSectionProps> = ({
  tasks,
  isExpanded,
  onToggle,
  onTaskClick
}) => {
  return (
    <div className="dashboard__section">
      <h2 
        className="dashboard__section-title" 
        onClick={onToggle} 
        style={{ 
          cursor: 'pointer', 
          userSelect: 'none', 
          position: 'relative' 
        }}
      >
        今日のタスク
        {tasks.length > 0 && (
          <span style={{
            backgroundColor: 'var(--color-info)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-1) var(--space-3)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            marginLeft: 'var(--space-4)',
            minWidth: '18px',
            textAlign: 'center',
            display: 'inline-block'
          }}>
            {tasks.length}
          </span>
        )}
        <span 
          className={`dashboard__toggle-icon ${isExpanded ? 'dashboard__toggle-icon--expanded' : ''}`} 
          style={{ 
            marginLeft: 'var(--space-4)', 
            fontSize: 'var(--font-size-base)' 
          }}
        >
          ▶
        </span>
      </h2>
      
      {isExpanded && (
        <div className="dashboard__task-cards">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onTaskClick={() => onTaskClick(task)} 
                disableSelection={false}
                hideTodayText={true}
              />
            ))
          ) : (
            <p className="dashboard__no-tasks">今日のタスクはありません</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TodayTasksSection;