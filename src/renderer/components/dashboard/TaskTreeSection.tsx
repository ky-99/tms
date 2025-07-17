import React from 'react';
import TaskTreeOverview from '../tasks/TaskTreeOverview';
import { Task } from '../../types';

interface TaskTreeSectionProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskTreeSection: React.FC<TaskTreeSectionProps> = ({
  tasks,
  onTaskClick
}) => {
  return (
    <div className="dashboard__section dashboard__section--tree-overview">
      <TaskTreeOverview tasks={tasks} onTaskClick={onTaskClick} />
    </div>
  );
};

export default TaskTreeSection;