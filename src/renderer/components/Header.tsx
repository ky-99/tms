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
          <span className="sidebar-text">Dashboard</span>
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
          <span className="sidebar-text">Tasks</span>
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
          <span className="sidebar-text">Analytics</span>
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
          <span className="sidebar-text">Export</span>
        </Link>
        <Link 
          to="/workspace" 
          className={`sidebar-link ${location.pathname === '/workspace' ? 'active' : ''}`}
        >
          <div className="sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4Z"/>
            </svg>
          </div>
          <span className="sidebar-text">WorkSpace</span>
        </Link>
      </div>
    </nav>
  );
};

export default Header;