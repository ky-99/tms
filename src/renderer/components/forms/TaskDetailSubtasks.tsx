import React from 'react';
import { Task } from '../../types';
import { TASK_STATUS_LABELS } from '../../constants/task';

interface TaskDetailSubtasksProps {
  task: Task;
  onChildTaskClick?: (childTask: Task) => void;
}

const TaskDetailSubtasks: React.FC<TaskDetailSubtasksProps> = ({ 
  task, 
  onChildTaskClick 
}) => {
  if (!task.children || task.children.length === 0) {
    return null;
  }

  return (
    <div className="task-detail-section">
      <h3>子タスク ({task.children.length})</h3>
      <div className="task-detail-children">
        {task.children.map((child: Task) => (
          <div 
            key={child.id} 
            className="task-detail-child"
            onClick={() => onChildTaskClick?.(child)}
            style={{ cursor: onChildTaskClick ? 'pointer' : 'default' }}
          >
            <span className={`child-status ${child.status}`}>
              {TASK_STATUS_LABELS[child.status]}
            </span>
            <span className="child-title">{child.title}</span>
            {child.endDate && (
              <span className="child-due-date">
                {new Date(child.endDate).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskDetailSubtasks;