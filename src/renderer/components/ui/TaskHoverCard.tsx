import React from 'react';
import { Task } from '../../types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getTaskStartDateTime, getTaskEndDateTime } from '../../utils/taskUtils';

interface TaskHoverCardProps {
  task: Task;
  position: { x: number; y: number };
  isVisible: boolean;
}

const TaskHoverCard: React.FC<TaskHoverCardProps> = ({ task, position, isVisible }) => {
  if (!isVisible) return null;

  const startDateTime = getTaskStartDateTime(task);
  const endDateTime = getTaskEndDateTime(task);

  const formatDateTime = (date: Date | null) => {
    if (!date) return null;
    return format(date, 'M/d (E) HH:mm', { locale: ja });
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return '緊急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '中';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '未着手';
      case 'in_progress': return '進行中';
      case 'completed': return '完了';
      default: return '未着手';
    }
  };

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 9999,
    pointerEvents: 'none'
  };

  return (
    <div className="task-hover-card" style={cardStyle}>
      <div className="task-hover-card-content">
        <div className="task-hover-header">
          <h3 className="task-hover-title">{task.title}</h3>
          <div className="task-hover-meta">
            <span className={`task-hover-status status-${task.status}`}>
              {getStatusText(task.status)}
            </span>
            <span className={`task-hover-priority priority-${task.priority}`}>
              {getPriorityText(task.priority)}
            </span>
            {(startDateTime || endDateTime) && (
              <span className="task-hover-date">
                {startDateTime && endDateTime ? (
                  `${format(startDateTime, 'M/d H:mm')} 〜 ${format(endDateTime, 'M/d H:mm')}`
                ) : startDateTime ? (
                  `${format(startDateTime, 'M/d H:mm')} 〜`
                ) : endDateTime ? (
                  `〜 ${format(endDateTime, 'M/d H:mm')}`
                ) : null}
              </span>
            )}
          </div>
        </div>
        
        {task.description && (
          <div className="task-hover-description">
            {task.description.length > 60 
              ? `${task.description.substring(0, 60)}...` 
              : task.description
            }
          </div>
        )}
        
        {task.tags && task.tags.length > 0 && (
          <div className="task-hover-tags">
            {task.tags.slice(0, 3).map(tag => (
              <span 
                key={tag.id} 
                className="task-hover-tag"
                style={{ backgroundColor: tag.color || '#6b7280' }}
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="task-hover-tag-more">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskHoverCard;