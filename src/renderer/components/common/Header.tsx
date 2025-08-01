import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useTaskContext } from '../../contexts/TaskContext';
import { useDateManager } from '../../hooks/useDateManager';
import { useTheme } from '../../contexts/ThemeContext';
import { useTaskHover } from '../../hooks/useTaskHover';
import { Task } from '../../types';
import TaskHoverCard from '../ui/TaskHoverCard';

// Electron APIの型定義
declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
      };
      workspace: any; // 既存のワークスペース機能
      task: any; // 既存のタスク機能
    };
  }
}

const Header: React.FC = () => {
  const [location] = useLocation();
  const { tasks } = useTaskContext();
  const { todayTasks, overdueTasks } = useDateManager(tasks);
  const { theme, toggleTheme } = useTheme();
  const { hoverState, handleMouseEnter, handleMouseLeave, handleMouseMove } = useTaskHover(750);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // ウィンドウリサイズを監視
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // タスクの簡潔な表示用のタイトルフォーマット
  const formatTaskTitle = (title: string) => {
    return title.length > 30 ? `${title.substring(0, 30)}...` : title;
  };

  // 画面幅に応じてタスク表示数を動的に調整
  const getMaxTaskCount = () => {
    if (windowWidth < 800) return 2; // 狭い画面では2つまで
    if (windowWidth < 1000) return 4; // 中程度の画面では4つまで
    if (windowWidth < 1400) return 6; // 広い画面では6つまで
    return 8; // 非常に広い画面では8つまで
  };

  const maxTasks = getMaxTaskCount();
  const displayTodayTasks = todayTasks.slice(0, maxTasks);
  const displayOverdueTasks = overdueTasks.slice(0, maxTasks);
  
  // ホバーされているタスクを取得
  const hoveredTask = React.useMemo(() => {
    if (!hoverState.taskId) return null;
    return [...todayTasks, ...overdueTasks].find(task => task.id === hoverState.taskId) || null;
  }, [hoverState.taskId, todayTasks, overdueTasks]);

  // 期限切れタスクの数を計算（既存のロジックを保持）
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
    <>
      {/* ヘッダー */}
      <header className="top-header">
        <div className="header-content">
          <div className="header-left">
            {/* Macのネイティブボタン用スペース */}
          </div>
          
          <div className="header-tasks header-drag-region">
            {/* 期限切れタスク */}
            {displayOverdueTasks.length > 0 && (
              <div className="header-task-section overdue-section">
                <div className="task-section-header">
                  <span className="task-section-title">期限切れ</span>
                  <span className="task-section-count">{overdueTasks.length}</span>
                </div>
                <div className="task-list-mini">
                  {displayOverdueTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item-mini overdue`}
                      onMouseEnter={(e) => handleMouseEnter(task.id, e)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="task-title-mini">{formatTaskTitle(task.title)}</span>
                    </div>
                  ))}
                  {overdueTasks.length > maxTasks && (
                    <div className="task-more">他 {overdueTasks.length - maxTasks} 件...</div>
                  )}
                </div>
              </div>
            )}
            
            {/* 今日のタスク */}
            <div className="header-task-section today-section">
              <div className="task-section-header">
                <span className="task-section-title">今日のタスク</span>
                <span className="task-section-count">{todayTasks.length}</span>
              </div>
              {displayTodayTasks.length > 0 ? (
                <div className="task-list-mini">
                  {displayTodayTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item-mini status-${task.status}`}
                      onMouseEnter={(e) => handleMouseEnter(task.id, e)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="task-title-mini">{formatTaskTitle(task.title)}</span>
                    </div>
                  ))}
                  {todayTasks.length > maxTasks && (
                    <div className="task-more">他 {todayTasks.length - maxTasks} 件...</div>
                  )}
                </div>
              ) : (
                <div className="no-tasks">今日のタスクはありません</div>
              )}
            </div>
          </div>
          
          <div className="header-right">
            <button 
              className="theme-toggle-button"
              onClick={toggleTheme}
              title={`${theme === 'light' ? 'ダーク' : 'ライト'}モードに切り替え`}
            >
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* サイドバー */}
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
              to="/views" 
              className={`nav-link ${location === '/views' ? 'active' : ''}`}
              title="Views"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3H21C21.5,3 22,3.5 22,4V20C22,20.5 21.5,21 21,21H3C2.5,21 2,20.5 2,20V4C2,3.5 2.5,3 3,3M3,8V13H8V8H3M9,8V13H15V8H9M16,8V13H21V8H16M3,14V19H8V14H3M9,14V19H15V14H9M16,14V19H21V14H16Z"/>
              </svg>
              <span className="nav-text">Views</span>
            </Link>
            <Link 
              to="/tasks" 
              className={`nav-link ${location.startsWith('/tasks') ? 'active' : ''}`}
              title="Tasks"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V9H7V7M7,11H17V13H7V11M7,15H13V17H7V15Z"/>
              </svg>
              <span className="nav-text">Tasks</span>
              {overdueCount > 0 && (
                <span className="overdue-badge">{overdueCount}</span>
              )}
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
                <path d="M12,1L8,5H11V14H13V5H16M18,23H6C4.89,23 4,22.1 4,21V9A2,2 0 0,1 6,7H9V9H6V21H18V9H15V7H18A2,2 0 0,1 20,9V21A2,2 0 0,1 18,23Z"/>
              </svg>
            <span className="nav-text">Export</span>
          </Link>
          <Link 
            to="/workspace" 
            className={`nav-link ${location === '/workspace' ? 'active' : ''}`}
            title="WorkSpace"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2,3H8C9.1,3 10,3.9 10,5V9C10,10.1 9.1,11 8,11H2C0.9,11 0,10.1 0,9V5C0,3.9 0.9,3 2,3M2,13H8C9.1,13 10,13.9 10,15V19C10,20.1 9.1,21 8,21H2C0.9,21 0,20.1 0,19V15C0,13.9 0.9,13 2,13M14,3H20C21.1,3 22,3.9 22,5V9C22,10.1 21.1,11 20,11H14C12.9,11 12,10.1 12,9V5C12,3.9 12.9,3 14,3M14,13H20C21.1,13 22,13.9 22,15V19C22,20.1 21.1,21 20,21H14C12.9,21 12,20.1 12,19V15C12,13.9 12.9,13 14,13Z"/>
          </svg>
          <span className="nav-text">WorkSpace</span>
        </Link>
      </nav>
    </div>
  </aside>
  
  {/* Task Hover Card */}
  {hoveredTask && hoverState.isVisible && (
    <TaskHoverCard 
      task={hoveredTask}
      position={hoverState.position}
      isVisible={hoverState.isVisible}
    />
  )}
</>
);
};

export default Header;