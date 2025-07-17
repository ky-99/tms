import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTaskContext } from '../../contexts/TaskContext';

const Header: React.FC = () => {
  const [location] = useLocation();
  const { tasks } = useTaskContext();

  // 期限切れタスクの数を計算
  const overdueCount = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // すべてのタスクを再帰的にフラット化
    const flattenTasks = (tasks: any[]): any[] => {
      const result: any[] = [];
      
      tasks.forEach(task => {
        result.push(task);
        if (task.children && task.children.length > 0) {
          result.push(...flattenTasks(task.children));
        }
      });
      
      return result;
    };

    const flatTasks = flattenTasks(tasks);

    return flatTasks.filter(task => {
      // ルーティンタスクは期限切れとして表示しない
      if (task.isRoutine || task.is_routine) return false;
      
      const dueDateValue = task.dueDate || task.due_date;
      if (!dueDateValue || task.status === 'completed') return false;
      
      const dueDate = new Date(dueDateValue);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() < todayTimestamp;
    }).length;
  }, [tasks]);


  return (
    <header className="header header-visible">
      <div className="header-content">
        <Link to="/" className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21M20 13.09V10.09L17.5 7.59L16.09 9L18.5 11.41L16.09 13.82L17.5 15.23L20 12.73C20.6 12.13 20.6 11.12 20 10.5L20 13.09M15.82 12L18.23 9.59L16.82 8.18L14.41 10.59L12 8.18L10.59 9.59L13 12L10.59 14.41L12 15.82L14.41 13.41L16.82 15.82L18.23 14.41L15.82 12Z"/>
          </svg>
          <span className="logo-text">TaskFlowy</span>
        </Link>
        
        <nav className="header-nav">
          <Link 
            to="/" 
            className={`nav-link ${location === '/' ? 'active' : ''}`}
          >
            <span>Dashboard</span>
            {overdueCount > 0 && (
              <span className="overdue-badge">{overdueCount}</span>
            )}
          </Link>
          <Link 
            to="/tasks" 
            className={`nav-link ${location.startsWith('/tasks') ? 'active' : ''}`}
          >
            Tasks
          </Link>
          <Link 
            to="/analyze" 
            className={`nav-link ${location === '/analyze' ? 'active' : ''}`}
          >
            Analytics
          </Link>
          <Link 
            to="/export" 
            className={`nav-link ${location === '/export' ? 'active' : ''}`}
          >
            Export
          </Link>
          <Link 
            to="/workspace" 
            className={`nav-link ${location === '/workspace' ? 'active' : ''}`}
          >
            WorkSpace
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;