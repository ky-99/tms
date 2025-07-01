/**
 * Loading Spinner component
 * Displays loading indicators with different sizes and styles
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  text
}) => {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <span className="loading-spinner">⟳</span>
      {text && (
        <p className="loading-text">{text}</p>
      )}
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = '読み込み中...',
  className = ''
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`loading-overlay-fullscreen ${className}`}>
      <div className="loading-overlay-content">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
};