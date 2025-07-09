/**
 * Reusable Modal component
 * Standardizes modal behavior across the app
 */

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  contentStyle?: React.CSSProperties & { top?: number; left?: number; right?: number; };
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  contentStyle = {}
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    // For filter modals, we need to check if the click is outside the modal content
    if (className?.includes('filter-modal')) {
      const target = e.target as HTMLElement;
      const modalContent = document.querySelector('.modal-content.filter-modal');
      if (modalContent && !modalContent.contains(target) && closeOnOverlayClick) {
        onClose();
      }
    } else if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };
  
  // For filter modal, we need to set CSS variables for positioning
  const modalStyle = className?.includes('filter-modal') ? {
    '--modal-top': `${contentStyle.top}px`,
    '--modal-left': contentStyle.left !== undefined ? `${contentStyle.left}px` : undefined,
    '--modal-right': contentStyle.right !== undefined ? `${contentStyle.right}px` : undefined,
  } as React.CSSProperties : {};
  
  return (
    <div className={`modal ${className}`} onClick={handleOverlayClick} style={modalStyle}>
      <div className={`modal-content ${className}`} style={className?.includes('filter-modal') ? {} : contentStyle}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2>{title}</h2>
            )}
            {showCloseButton && (
              <button
                className="close-btn"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};