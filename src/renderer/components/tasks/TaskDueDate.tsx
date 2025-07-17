/**
 * Task Due Date component
 * Displays task due date with relative time and overdue styling
 */

import React from 'react';
import { Task } from '../../types';
import { getDueDateText, isTaskOverdue } from '../../utils/taskUtils';
import { formatDate } from '../../utils';

interface TaskDueDateProps {
  task: Task;
  format?: 'relative' | 'absolute' | 'both';
  showIcon?: boolean;
  className?: string;
}

export const TaskDueDate: React.FC<TaskDueDateProps> = ({
  task,
  format = 'relative',
  showIcon = true,
  className = ''
}) => {
  if (!task.dueDate) {
    return null;
  }
  
  const isOverdue = isTaskOverdue(task);
  const relativeText = getDueDateText(task);
  const absoluteDate = formatDate(task.dueDate, 'medium');
  
  const baseClasses = 'task-due-date';
  const statusClasses = isOverdue 
    ? 'task-due-date-overdue' 
    : 'task-due-date-normal';
  const classes = `${baseClasses} ${statusClasses} ${className}`;
  
  let displayText = '';
  switch (format) {
    case 'relative':
      displayText = relativeText || absoluteDate;
      break;
    case 'absolute':
      displayText = absoluteDate;
      break;
    case 'both':
      displayText = relativeText ? `${relativeText} (${absoluteDate})` : absoluteDate;
      break;
  }
  
  return (
    <span className={classes}>
      {showIcon && (
        <span className={`task-due-date-icon ${isOverdue ? 'task-due-date-icon-overdue' : 'task-due-date-icon-normal'}`}>
          📅
        </span>
      )}
      {displayText}
      {isOverdue && (
        <span className="task-due-date-overdue-text">
          (期限切れ)
        </span>
      )}
    </span>
  );
};