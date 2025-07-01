/**
 * Toast notification component
 * Displays temporary messages to users
 */

import React, { useEffect } from 'react';
import { AppError, ErrorType } from '../../contexts';

interface ToastProps {
  error: AppError;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ error, onClose }) => {
  const { id, type, title, message } = error;

  const getTypeStyles = (type: ErrorType) => {
    switch (type) {
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      case 'success':
        return 'toast-success';
      default:
        return 'toast-default';
    }
  };

  const getIcon = (type: ErrorType) => {
    switch (type) {
      case 'error':
        return <span className="toast-icon toast-icon-error">⚠</span>;
      case 'warning':
        return <span className="toast-icon toast-icon-warning">⚠</span>;
      case 'info':
        return <span className="toast-icon toast-icon-info">ℹ</span>;
      case 'success':
        return <span className="toast-icon toast-icon-success">✓</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`toast ${getTypeStyles(type)}`}>
      <div className="toast-content">
        <div className="toast-header">
          <div className="toast-icon-wrapper">
            {getIcon(type)}
          </div>
          <div className="toast-body">
            <p className="toast-title">
              {title}
            </p>
            {message && (
              <p className="toast-message">
                {message}
              </p>
            )}
          </div>
          <div className="toast-close-wrapper">
            <button
              className="toast-close"
              onClick={() => onClose(id)}
            >
              <span>×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};