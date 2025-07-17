import React from 'react';
import { Task } from '../../types';
import { useTaskContext } from '../../contexts/TaskContext';

interface TaskDetailHeaderProps {
  task: Task;
  isCreating: boolean;
  onClose: () => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  task,
  isCreating,
  onClose
}) => {
  const { tasks } = useTaskContext();
  const buildBreadcrumb = (currentTask: Task): Task[] => {
    const breadcrumb: Task[] = [];
    let current: Task | null = currentTask;
    
    while (current) {
      breadcrumb.unshift(current);
      current = current.parentId ? tasks.find((t: Task) => t.id === current!.parentId) || null : null;
    }
    
    return breadcrumb;
  };

  const breadcrumb = isCreating ? [] : buildBreadcrumb(task);

  return (
    <div className="task-detail-header">
      <div className="task-detail-breadcrumb">
        {!isCreating && breadcrumb.length > 1 && (
          <div className="breadcrumb-path">
            {breadcrumb.slice(0, -1).map((ancestor, index) => (
              <span key={ancestor.id} className="breadcrumb-item">
                {ancestor.title}
                {index < breadcrumb.length - 2 && (
                  <span className="breadcrumb-separator"> / </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      <button 
        className="task-detail-close" 
        onClick={onClose}
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
};