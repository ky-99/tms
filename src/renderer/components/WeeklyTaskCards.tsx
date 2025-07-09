import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types';

interface WeeklyTaskCardsProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const WeeklyTaskCards: React.FC<WeeklyTaskCardsProps> = ({ tasks, onTaskClick }) => {
  const navigate = useNavigate();
  // 全タスクを平坦化
  const flattenTasks = (taskList: Task[]): Task[] => {
    const result: Task[] = [];
    
    const addTask = (task: Task) => {
      result.push(task);
      if (task.children) {
        task.children.forEach(addTask);
      }
    };
    
    taskList.forEach(addTask);
    return result;
  };

  // 今週のタスクのみをフィルタリング（メモ化）
  const { weeklyTasks, completedTasks, inProgressTasks, pendingTasks } = useMemo(() => {
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
      const dueDateValue = task.dueDate || task.due_date;
      if (!dueDateValue) return false;
      const dueDate = new Date(dueDateValue);
      return dueDate >= sunday && dueDate <= saturday;
    });

    return {
      weeklyTasks: weeklyFiltered,
      completedTasks: weeklyFiltered.filter(task => task.status === 'completed'),
      inProgressTasks: weeklyFiltered.filter(task => task.status === 'in_progress'),
      pendingTasks: weeklyFiltered.filter(task => task.status === 'pending')
    };
  }, [tasks]);

  const priorityColors = {
    urgent: '#ef4444',
    high: '#f97316', 
    medium: '#eab308',
    low: '#22c55e'
  };

  const priorityLabels = {
    urgent: '緊急',
    high: '高',
    medium: '中',
    low: '低'
  };

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  const TaskCard: React.FC<{ task: Task; status: string }> = ({ task, status }) => {
    const isParentTask = task.children && task.children.length > 0;
    
    return (
      <div 
        className={`weekly-task-card ${status}`}
        onClick={() => handleTaskClick(task)}
        style={{ 
          cursor: 'pointer',
          ...(status === 'completed' ? { 
            backgroundColor: '#d1fae5', 
            borderColor: '#10b981'
          } : {})
        }}
        title="クリックでタスク詳細を表示"
      >
        <div className="task-card-header">
          <span 
            className="task-priority-badge"
            style={{ backgroundColor: priorityColors[task.priority as keyof typeof priorityColors] }}
          >
            {priorityLabels[task.priority as keyof typeof priorityLabels]}
          </span>
          {status === 'completed' && <span className="completed-check">✓</span>}
          {status === 'in_progress' && <span className="in-progress-indicator">⏳</span>}
        </div>
        <div className="task-card-title">
          {isParentTask && (
            <span 
              className="parent-task-icon" 
              style={{ 
                color: '#8b5cf6', 
                marginRight: '6px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              title="親タスク"
            >
              ◎
            </span>
          )}
          {task.title}
        </div>
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