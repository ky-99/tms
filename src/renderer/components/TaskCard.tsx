import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  due_date?: string;
  created_at?: string;
  createdAt?: string;
  completedAt?: string;
  completed_at?: string;
  children?: Task[];
  isRoutine?: boolean;
  is_routine?: boolean;
}

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate();

  const handleDoubleClick = () => {
    navigate(`/tasks/${task.id}`);
  };

  // メモ化された定数マップ
  const statusMap = useMemo(() => ({
    'pending': '未着手',
    'in_progress': '進行中',
    'completed': '完了',
    'cancelled': 'キャンセル'
  }), []);

  const priorityMap = useMemo(() => ({
    'low': '低',
    'medium': '中',
    'high': '高',
    'urgent': '緊急'
  }), []);

  // メモ化されたタスク状態計算
  const taskState = useMemo(() => {
    const dueDateValue = task.dueDate || task.due_date;
    const isRoutine = task.isRoutine || task.is_routine;
    const isParent = task.children && task.children.length > 0;
    const isCompleted = task.status === 'completed';
    
    let isOverdue = false;
    let dueDateText = null;
    
    if (dueDateValue) {
      const today = new Date();
      const dueDate = new Date(dueDateValue);
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      isOverdue = dueDate < today && !isCompleted;
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays !== 0) {
        if (diffDays === 1) dueDateText = '明日';
        else if (diffDays === -1) dueDateText = '昨日';
        else if (diffDays < 0) dueDateText = `${Math.abs(diffDays)}日前`;
        else dueDateText = `${diffDays}日後`;
      }
    }

    return {
      isRoutine,
      isParent,
      isCompleted,
      isOverdue,
      dueDateText,
      statusText: statusMap[task.status as keyof typeof statusMap] || task.status,
      priorityText: priorityMap[task.priority as keyof typeof priorityMap] || task.priority
    };
  }, [task, statusMap, priorityMap]);

  // メモ化されたスタイル計算
  const { className, style } = useMemo(() => {
    const { isRoutine, isCompleted, isOverdue } = taskState;
    
    const cls = `task-card ${isOverdue ? 'overdue' : ''} ${!isRoutine && isCompleted ? 'completed completed-today' : ''}`;
    
    const sty = {
      cursor: 'pointer' as const,
      ...(isRoutine ? {
        backgroundColor: '#fff5e6',
        borderColor: '#ffcc80',
        opacity: 1
      } : isCompleted ? {
        backgroundColor: '#d1fae5',
        borderColor: '#10b981',
        opacity: 1
      } : {})
    };

    return { className: cls, style: sty };
  }, [taskState]);

  return (
    <div 
      className={className}
      onDoubleClick={handleDoubleClick}
      style={style}
    >
      <div className="task-card-header">
        <h3 className="task-card-title">
          {taskState.isParent && (
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
          {taskState.isRoutine && (
            <span 
              style={{ 
                color: '#3b82f6', 
                marginRight: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="ルーティンタスク"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
              </svg>
            </span>
          )}
          {task.title}
        </h3>
        <div className="task-card-badges">
          <span className={`status ${task.status}`}>
            {taskState.statusText}
          </span>
          <span className={`priority ${task.priority}`}>
            {taskState.priorityText}
          </span>
        </div>
      </div>
      
      {task.description && (
        <p className="task-card-description">{task.description}</p>
      )}
      
      <div className="task-card-footer">
        {(task.dueDate || task.due_date) && !taskState.isRoutine && taskState.dueDateText && (
          <span className={`due-date ${taskState.isOverdue ? 'overdue' : ''}`}>
            {taskState.dueDateText}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;