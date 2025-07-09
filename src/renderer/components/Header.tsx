import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21M20 13.09V10.09L17.5 7.59L16.09 9L18.5 11.41L16.09 13.82L17.5 15.23L20 12.73C20.6 12.13 20.6 11.12 20 10.5L20 13.09M15.82 12L18.23 9.59L16.82 8.18L14.41 10.59L12 8.18L10.59 9.59L13 12L10.59 14.41L12 15.82L14.41 13.41L16.82 15.82L18.23 14.41L15.82 12Z"/>
          </svg>
          <span className="logo-text">TaskFlowy</span>
        </div>
      </div>
      
      <div className="sidebar-menu">
        <Link 
          to="/" 
          className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
          </div>
          <span className="sidebar-text">ダッシュボード</span>
        </Link>
        <Link 
          to="/tasks" 
          className={`sidebar-link ${location.pathname.startsWith('/tasks') ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <span className="sidebar-text">タスク管理</span>
        </Link>
        <Link 
          to="/analyze" 
          className={`sidebar-link ${location.pathname === '/analyze' ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5,2C3.89,2 3,2.89 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4C21,2.89 20.1,2 19,2H5M5,4H19V20H5V4M7,6V18H9V6H7M11,9V18H13V9H11M15,11V18H17V11H15Z"/>
            </svg>
          </div>
          <span className="sidebar-text">分析</span>
        </Link>
        <Link 
          to="/export" 
          className={`sidebar-link ${location.pathname === '/export' ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <span className="sidebar-text">マークダウン化</span>
        </Link>
        <Link 
          to="/dump" 
          className={`sidebar-link ${location.pathname === '/dump' ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,3C7.58,3 4,4.79 4,7V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V7C20,4.79 16.42,3 12,3M12,5C15.87,5 18,6.21 18,7C18,7.79 15.87,9 12,9C8.13,9 6,7.79 6,7C6,6.21 8.13,5 12,5M6,9.5C7.97,10.5 9.97,10.9 12,10.9C14.03,10.9 16.03,10.5 18,9.5V12C18,12.79 15.87,14 12,14C8.13,14 6,12.79 6,12V9.5M6,14.5C7.97,15.5 9.97,15.9 12,15.9C14.03,15.9 16.03,15.5 18,14.5V17C18,17.79 15.87,19 12,19C8.13,19 6,17.79 6,17V14.5Z"/>
            </svg>
          </div>
          <span className="sidebar-text">ダンプ</span>
        </Link>
        <Link 
          to="/shortcuts" 
          className={`sidebar-link ${location.pathname === '/shortcuts' ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1,5A2,2 0 0,0 3,7H5V5H3V7H5V9H3A2,2 0 0,0 1,7V5M7,5V7H9V5H7M11,5V7H13V5H11M15,5V7H17V5H15M19,5V7H21V5H19M1,11A2,2 0 0,0 3,13H5V11H3V13H5V15H3A2,2 0 0,0 1,13V11M7,11V13H9V11H7M11,11V13H13V11H11M15,11V13H17V11H15M19,11V13H21V11H19M1,17A2,2 0 0,0 3,19H17A2,2 0 0,0 19,17V19H21V17H19V19H17V17H19V15H3A2,2 0 0,0 1,17V19H3V17H1M3,17H17V19H3V17Z"/>
            </svg>
          </div>
          <span className="sidebar-text">ショートカット</span>
        </Link>
      </div>
    </nav>
  );
};

export default Header;