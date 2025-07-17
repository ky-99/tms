/**
 * Reusable Modal component with custom implementation
 * Lightweight alternative to Headless UI with focus management
 */

import React, { useEffect, useRef } from 'react';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  
  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus the dialog container
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    } else {
      // Return focus to previous element
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    }
  }, [isOpen]);
  
  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  // For filter modal, we need to set CSS variables for positioning
  const modalStyle = className?.includes('filter-modal') ? {
    '--modal-top': `${contentStyle.top}px`,
    '--modal-left': contentStyle.left !== undefined ? `${contentStyle.left}px` : undefined,
    '--modal-right': contentStyle.right !== undefined ? `${contentStyle.right}px` : undefined,
  } as React.CSSProperties : {};
  
  return (
    <div 
      ref={dialogRef}
      className={`modal-dialog ${className}`}
      style={modalStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      tabIndex={-1}
    >
      <div 
        className={`modal-backdrop ${className}`}
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div className="modal-container">
        <div className={`modal-content ${className}`} style={className?.includes('filter-modal') ? {} : contentStyle}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="modal-header">
              {title && (
                <h2 id="modal-title">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  className="close-btn"
                  onClick={onClose}
                  type="button"
                  aria-label="閉じる"
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
    </div>
  );
};