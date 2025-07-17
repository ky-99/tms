import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { Task } from '../../types';
import { TASK_PRIORITY_LABELS } from '../../constants/task';
// Removed unused import: TASK_PRIORITY_COLORS

interface WeeklyTaskCardsProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const WeeklyTaskCards: React.FC<WeeklyTaskCardsProps> = ({ tasks, onTaskClick }) => {
  const [, setLocation] = useLocation();
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
  const { completedTasks, inProgressTasks, pendingTasks } = useMemo(() => {
    // Removed unused destructuring: weeklyTasks
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
      const dueDateValue = task.dueDate;
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
          <span className={`priority ${task.priority}`}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
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