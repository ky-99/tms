import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { Task } from '../../types';
import { TASK_PRIORITY_LABELS } from '../../constants/task';
import { flattenTasks, getTaskEndDateTime } from '../../utils/taskUtils';

interface WeeklyTaskCardsProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const WeeklyTaskCards: React.FC<WeeklyTaskCardsProps> = ({ tasks, onTaskClick }) => {
  const [, setLocation] = useLocation();

  // 今週のタスクのみをフィルタリング（メモ化）
  const { completedTasks, inProgressTasks, pendingTasks } = useMemo(() => {
    const today = new Date();
    const sunday = new Date(today);
    // 今週の日曜日を取得（週始まり）
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const flatTasks = flattenTasks(tasks);
    const weeklyFiltered = flatTasks.filter(task => {
      const endDateTime = getTaskEndDateTime(task);
      if (!endDateTime) return false;
      return endDateTime >= sunday && endDateTime <= saturday;
    });

    return {
      weeklyTasks: weeklyFiltered,
      completedTasks: weeklyFiltered.filter(task => task.status === 'completed'),
      inProgressTasks: weeklyFiltered.filter(task => task.status === 'in_progress'),
      pendingTasks: weeklyFiltered.filter(task => task.status === 'pending')
    };
  }, [tasks]);


  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      setLocation(`/tasks/${task.id}`);
    }
  };

  const TaskCard: React.FC<{ task: Task; status: string }> = ({ task, status }) => {
    const isParentTask = task.children && task.children.length > 0;
    
    return (
      <div 
        className={`weekly-task-card ${status}`}
        onClick={() => handleTaskClick(task)}
        style={{ cursor: 'pointer' }}
        title="クリックでタスク詳細を表示"
      >
        <div className="task-card-header">
          <div className="task-card-badges">
            <span className={`priority priority-${task.priority}`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            <span className={`status status-${task.status}`}>
              {task.status === 'completed' ? '完了' : task.status === 'in_progress' ? '進行中' : '未着手'}
            </span>
          </div>
        </div>
        <div className="task-card-title">
          {isParentTask && (
            <span 
              className="parent-task-icon" 
              title="親タスク"
            >
              ◎
            </span>
          )}
          {task.title}
        </div>
        {task.description && (
          <div className="task-card-description">
            {task.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="weekly-task-cards">
      <div className="task-status-sections">
        <div className="task-cards-section completed-section">
          <h3>完了したタスク ({completedTasks.length})</h3>
          <div className="task-cards-grid">
            {completedTasks.length === 0 ? (
              <div className="no-tasks-message">完了したタスクがありません</div>
            ) : (
              completedTasks.map(task => (
                <TaskCard key={task.id} task={task} status="completed" />
              ))
            )}
          </div>
        </div>
        
        <div className="task-cards-section in-progress-section">
          <h3>進行中のタスク ({inProgressTasks.length})</h3>
          <div className="task-cards-grid">
            {inProgressTasks.length === 0 ? (
              <div className="no-tasks-message">進行中のタスクがありません</div>
            ) : (
              inProgressTasks.map(task => (
                <TaskCard key={task.id} task={task} status="in_progress" />
              ))
            )}
          </div>
        </div>
        
        <div className="task-cards-section pending-section">
          <h3>未着手のタスク ({pendingTasks.length})</h3>
          <div className="task-cards-grid">
            {pendingTasks.length === 0 ? (
              <div className="no-tasks-message">未着手のタスクがありません</div>
            ) : (
              pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} status="pending" />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyTaskCards;