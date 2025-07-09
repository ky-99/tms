import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onTasksChange: () => void;
  onAddSubTask?: (parentId: number) => void;
  onTaskClick?: (taskId: number) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
  onToggleExpand?: (taskId: number) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTasksChange, onAddSubTask, onTaskClick, onEditTask, onDeleteTask, onToggleExpand }) => {
  const navigate = useNavigate();

  const handleReturnToHome = () => {
    navigate('/tasks');
  };

  if (tasks.length === 0) {
    return (
      <div className="task-list">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            タスクがありません
          </p>
          <button 
            onClick={handleReturnToHome}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            タスクホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task, index) => (
        <div key={task.id}>
          <TaskItem
            task={task}
            level={0}
            onTasksChange={onTasksChange}
            onAddSubTask={onAddSubTask}
            onTaskClick={onTaskClick}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onToggleExpand={onToggleExpand}
          />
          {index < tasks.length - 1 && <div className="task-divider" />}
        </div>
      ))}
    </div>
  );
};

export default TaskList;