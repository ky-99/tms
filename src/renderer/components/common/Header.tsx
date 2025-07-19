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
    <aside className="sidebar">
      <div className="sidebar-content">
        <Link to="/" className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21M20 13.09V10.09L17.5 7.59L16.09 9L18.5 11.41L16.09 13.82L17.5 15.23L20 12.73C20.6 12.13 20.6 11.12 20 10.5L20 13.09M15.82 12L18.23 9.59L16.82 8.18L14.41 10.59L12 8.18L10.59 9.59L13 12L10.59 14.41L12 15.82L14.41 13.41L16.82 15.82L18.23 14.41L15.82 12Z"/>
          </svg>
          <span className="logo-text">TaskFlowy</span>
        </Link>
        
        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-link ${location === '/' ? 'active' : ''}`}
            title="Dashboard"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            <span className="nav-text">Dashboard</span>
            {overdueCount > 0 && (
              <span className="overdue-badge">{overdueCount}</span>
            )}
          </Link>
          <Link 
            to="/views" 
            className={`nav-link ${location === '/views' ? 'active' : ''}`}
            title="Views"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z"/>
            </svg>
            <span className="nav-text">Views</span>
          </Link>
          <Link 
            to="/tasks" 
            className={`nav-link ${location.startsWith('/tasks') ? 'active' : ''}`}
            title="Tasks"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <span className="nav-text">Tasks</span>
          </Link>
          <Link 
            to="/analyze" 
            className={`nav-link ${location === '/analyze' ? 'active' : ''}`}
            title="Analytics"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
            </svg>
            <span className="nav-text">Analytics</span>
          </Link>
          <Link 
            to="/export" 
            className={`nav-link ${location === '/export' ? 'active' : ''}`}
            title="Export"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23,12L19,8V11H10V13H19V16M1,18V6C1,4.89 1.89,4 3,4H15A2,2 0 0,1 17,6V9H15V6H3V18H15V15H17V18A2,2 0 0,1 15,20H3C1.89,20 1,19.1 1,18Z"/>
            </svg>
            <span className="nav-text">Export</span>
          </Link>
          <Link 
            to="/workspace" 
            className={`nav-link ${location === '/workspace' ? 'active' : ''}`}
            title="WorkSpace"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z"/>
            </svg>
            <span className="nav-text">WorkSpace</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
};

export default Header;