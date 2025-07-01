/**
 * Task Status Badge component
 * Displays task status with appropriate styling
 */

import React from 'react';
import { Badge } from '../ui';
import { TaskStatus } from '../../types';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../../constants';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  size = 'sm',
  className
}) => {
  return (
    <Badge
      variant="status"
      color={TASK_STATUS_COLORS[status]}
      textColor="#ffffff"
      size={size}
      className={className}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
};