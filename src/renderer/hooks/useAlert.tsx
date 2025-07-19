import toast from 'react-hot-toast';
import React, { useEffect, useCallback } from 'react';

type AlertType = 'info' | 'warning' | 'error' | 'success' | 'danger' | 'prohibition';

interface AlertOptions {
  type?: AlertType;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// グローバルな確認ダイアログ状態管理
let activeConfirmDialogs = 0;

// 確認ダイアログがアクティブかどうかを確認する関数
export const hasActiveConfirmDialogs = () => activeConfirmDialogs > 0;

// キーボードショートカットを防ぐ関数
const preventKeyboardShortcuts = (e: KeyboardEvent) => {
  // ESCキー、Enterキー、qキーは許可（toast内の操作用）
  if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'q' || e.key === 'Q') {
    // 既に処理されている場合はブロック
    if (e.defaultPrevented) {
      e.stopPropagation();
    }
    return;
  }
  
  // Cmd/Ctrl + キーの組み合わせを防ぐ
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  
  // ナビゲーション系のキーを防ぐ
  const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Space', 'Delete', 'Backspace'];
  if (navigationKeys.includes(e.key)) {
    // Toast内の要素にフォーカスがある場合は許可
    const target = e.target as HTMLElement;
    const isInToast = target.closest('[data-hot-toast]');
    if (!isInToast) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
};

// 外部操作をブロックする関数
const blockExternalActions = () => {
  activeConfirmDialogs++;
  document.body.style.pointerEvents = 'none';
  document.body.style.userSelect = 'none';
  
  // Toaster以外のすべての要素の操作をブロック
  const toasterElements = document.querySelectorAll('[data-hot-toast]');
  toasterElements.forEach(el => {
    (el as HTMLElement).style.pointerEvents = 'auto';
  });
  
  // キーボードショートカットをブロック
  document.addEventListener('keydown', preventKeyboardShortcuts, { capture: true });
};

// 外部操作のブロックを解除する関数
const unblockExternalActions = () => {
  activeConfirmDialogs = Math.max(0, activeConfirmDialogs - 1);
  
  if (activeConfirmDialogs === 0) {
    document.body.style.pointerEvents = '';
    document.body.style.userSelect = '';
    
    // キーボードショートカットブロックを解除
    document.removeEventListener('keydown', preventKeyboardShortcuts, { capture: true });
  }
};

// Confirmation dialog component with keyboard support
const ConfirmationDialog: React.FC<{
  type: AlertType;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel?: () => void;
  toastId: string;
  visible: boolean;
}> = ({ type, message, confirmText, cancelText, onConfirm, onCancel, toastId, visible }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 既に処理されたイベントは無視
      if (e.defaultPrevented) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[DEBUG] Keyboard Enter pressed - dismissing toast:', toastId);
        toast.remove(toastId);
        console.log('[DEBUG] Toast removed, unblocking external actions');
        unblockExternalActions();
        console.log('[DEBUG] Executing onConfirm callback immediately');
        onConfirm();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        e.stopPropagation();
        toast.remove(toastId);
        unblockExternalActions();
        if (onCancel) {
          onCancel();
        }
      }
    };

    if (visible) {
      // captureフェーズで先に処理する
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [visible, toastId, onConfirm, onCancel]);

  return (
    <div className={`toast-custom ${visible ? 'animate-enter' : 'animate-leave'}`}>
      <div className="toast-content">
        <div className={`toast-icon ${type === 'danger' || type === 'error' ? 'danger' : type === 'prohibition' ? 'prohibition' : ''}`}>
          {type === 'danger' || type === 'error' ? (
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ) : type === 'prohibition' ? (
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 715.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 818.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="toast-message">{message}</div>
      </div>
      <div className="toast-actions">
        <button
          onClick={() => {
            toast.remove(toastId);
            unblockExternalActions();
            onCancel?.();
          }}
          className="toast-btn toast-btn-cancel"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            console.log('[DEBUG] Confirm button clicked - dismissing toast:', toastId);
            toast.remove(toastId);
            console.log('[DEBUG] Toast removed, unblocking external actions');
            unblockExternalActions();
            console.log('[DEBUG] Executing onConfirm callback immediately');
            onConfirm();
          }}
          className={`toast-btn toast-btn-confirm ${
            type === 'danger' || type === 'error' ? 'danger' : 'primary'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
};

// Simple wrapper to provide consistent API for existing code
export const useGlobalAlert = () => {
  const showAlert = (message: string, options: AlertOptions = {}) => {
    const { type = 'info', title, onConfirm, onCancel, showCancel, confirmText = 'OK', cancelText = 'キャンセル' } = options;
    
    const displayMessage = title ? `${title}: ${message}` : message;
    console.log('[DEBUG] showAlert called with:', { message, type, showCancel, hasOnConfirm: !!onConfirm });
    
    // For simple messages without confirmation
    if (!showCancel && !onConfirm) {
      switch (type) {
        case 'success':
          return toast.success(displayMessage, { duration: 1000 }); // 成功系は1秒
        case 'error':
        case 'danger':
          return toast.error(displayMessage, { duration: 4000 }); // エラー系は4秒
        case 'warning':
          return toast(displayMessage, { icon: '⚠️', duration: 1000 }); // 警告系は1秒
        case 'prohibition':
          return toast(displayMessage, { 
            icon: '🚫', 
            duration: 2000,
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626'
            }
          }); // 禁止系は2秒
        case 'info':
        default:
          return toast(displayMessage, { duration: Infinity }); // 情報系は確認ボタンが押されるまで
      }
    }

    // For confirmation dialogs - use react-hot-toast with custom rendering
    if (showCancel && onConfirm) {
      const toastId = `confirm-${Date.now()}-${Math.random()}`;
      
      // 外部操作をブロック
      blockExternalActions();
      
      toast.custom((t) => (
        <ConfirmationDialog
          type={type}
          message={displayMessage}
          confirmText={confirmText}
          cancelText={cancelText}
          onConfirm={onConfirm}
          onCancel={onCancel}
          toastId={t.id}
          visible={t.visible}
        />
      ), {
        id: toastId,
        duration: Infinity, // Keep confirmation dialogs open until user action
      });
    } else if (onConfirm) {
      // For simple confirmations without cancel, use toast with action
      const toastId = `simple-${Date.now()}-${Math.random()}`;
      
      // 外部操作をブロック
      blockExternalActions();
      
      toast.custom((t) => (
        <div className={`toast-custom ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
            <div className="toast-content">
              <div className={`toast-icon ${type === 'danger' || type === 'error' ? 'danger' : type === 'prohibition' ? 'prohibition' : ''}`}>
                {type === 'danger' || type === 'error' ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                ) : type === 'prohibition' ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 715.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 818.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="toast-message">{displayMessage}</div>
            </div>
            <div className="toast-actions">
              <button
                onClick={() => {
                  console.log('[DEBUG] Simple confirm button clicked - dismissing toast:', t.id);
                  toast.remove(t.id);
                  console.log('[DEBUG] Toast removed, unblocking external actions');
                  unblockExternalActions();
                  console.log('[DEBUG] Executing onConfirm callback immediately');
                  onConfirm();
                }}
                className={`toast-btn toast-btn-confirm ${
                  type === 'danger' || type === 'error' ? 'danger' : 'primary'
                }`}
              >
                {confirmText}
              </button>
            </div>
        </div>
      ), {
        id: toastId,
        duration: 4000, // Auto-dismiss after 4 seconds for simple confirmations
      });
    }
  };

  return { showAlert };
};