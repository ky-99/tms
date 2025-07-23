import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Task } from '../../types';

interface TaskBreadcrumbProps {
  task?: Task;
  tasks: Task[];
  isCreating?: boolean;
  parentId?: number;
  className?: string;
  onTaskNavigate?: (taskId: number) => void;
  onClose?: () => void;
}

const TaskBreadcrumb: React.FC<TaskBreadcrumbProps> = ({
  task,
  tasks,
  isCreating = false,
  parentId,
  className = '',
  onTaskNavigate,
  onClose
}) => {
  const [, setLocation] = useLocation();
  const [, setHashLocation] = useHashLocation();

  // タスクナビゲーション処理
  const handleTaskClick = (taskId: number) => {
    if (onTaskNavigate) {
      onTaskNavigate(taskId);
    } else {
      setLocation(`/tasks/${taskId}`);
    }
  };

  // ホームナビゲーション処理
  const handleHomeClick = () => {
    if (onClose) {
      onClose();
    }
    setLocation('/tasks');
    setHashLocation('/tasks');
  };

  // 階層構造を取得する関数
  const getTaskHierarchy = useMemo(() => {
    if (isCreating && parentId) {
      // 新規作成時：親タスクの階層を取得
      const parentTask = tasks.find(t => t.id === parentId);
      if (!parentTask) return [];
      
      const hierarchy: Task[] = [];
      let current: Task | undefined = parentTask;
      
      // 親から遡って階層を構築
      while (current) {
        hierarchy.unshift(current);
        if (current.parentId) {
          current = tasks.find(t => t.id === current!.parentId);
        } else {
          current = undefined;
        }
      }
      
      return hierarchy;
    } else if (task) {
      // 編集時：現在のタスクの階層を取得
      const hierarchy: Task[] = [];
      let current: Task | undefined = task;
      
      // 現在のタスクから遡って階層を構築
      while (current) {
        hierarchy.unshift(current);
        if (current.parentId) {
          current = tasks.find(t => t.id === current!.parentId);
        } else {
          current = undefined;
        }
      }
      
      return hierarchy;
    }
    
    return [];
  }, [task, tasks, isCreating, parentId]);

  if (getTaskHierarchy.length === 0 && !isCreating) {
    return null;
  }

  return (
    <nav className={`task-breadcrumb ${className}`}>
      <ol className="task-breadcrumb-list">
        <li className="task-breadcrumb-item">
          <button 
            className="task-breadcrumb-home"
            onClick={handleHomeClick}
            title="ホームに戻る"
          >
            ホーム
          </button>
        </li>
        
        {getTaskHierarchy
          .filter(hierarchyTask => hierarchyTask.title && hierarchyTask.title.trim() !== '')
          .map((hierarchyTask, index, filteredArray) => (
            <React.Fragment key={hierarchyTask.id}>
              <li className="task-breadcrumb-separator">
                <span>/</span>
              </li>
              <li className="task-breadcrumb-item">
                <button 
                  className={`task-breadcrumb-task clickable ${index === filteredArray.length - 1 && !isCreating ? 'current' : ''}`}
                  onClick={() => handleTaskClick(hierarchyTask.id)}
                  title={`${hierarchyTask.title} に移動`}
                >
                  {hierarchyTask.title}
                </button>
              </li>
            </React.Fragment>
          ))}
        
        {isCreating && (
          <>
            <li className="task-breadcrumb-separator">
              <span>/</span>
            </li>
            <li className="task-breadcrumb-item">
              <span className="task-breadcrumb-task current new">新しいタスク</span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};

export default TaskBreadcrumb;