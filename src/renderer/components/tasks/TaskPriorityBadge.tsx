/**
 * Task Priority Badge component
 * Displays task priority with appropriate styling
 */

import React from 'react';
import { Badge } from '../ui';
import { TaskPriority } from '../../types';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '../../constants';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
  className?: string;
}

export const TaskPriorityBadge: React.FC<TaskPriorityBadgeProps> = ({
  priority,
  size = 'sm',
  className
}) => {
  return (
    <Badge
      variant="priority"
      color={TASK_PRIORITY_COLORS[priority]}
      textColor="#ffffff"
      size={size}
      className={className}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
};