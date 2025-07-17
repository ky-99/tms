import React, { useEffect, useRef } from 'react';
import { useShortcut } from '../../contexts/ShortcutContext';
import '../../styles/status-priority-modal.css';

interface StatusPriorityModalProps {
  type: 'status' | 'priority';
  currentValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const StatusPriorityModal: React.FC<StatusPriorityModalProps> = ({
  type,
  currentValue,
  onSelect,
  onClose,
  position
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { setCurrentContext } = useShortcut();
  const statusOptions = [
    { value: 'pending', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' }
  ];

  const priorityOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'urgent', label: '緊急' }
  ];

  const options = type === 'status' ? statusOptions : priorityOptions;

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // モーダルのオープン時の処理
  useEffect(() => {
    setCurrentContext('modalOpen');
    
    return () => {
      setCurrentContext('global');
    };
  }, [setCurrentContext]);

  // 外部操作ブロックとクリックアウトサイド処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 背景操作を無効化
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    
    // モーダルのポインターイベントを再有効化
    if (modalRef.current) {
      modalRef.current.style.pointerEvents = 'auto';
    }
    
    // キーボードスクロールを防止
    const preventScroll = (e: KeyboardEvent) => {
      const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
      if (scrollKeys.includes(e.code)) {
        e.preventDefault();
      }
    };
    
    // ホイールスクロールを完全に防止
    const preventWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    
    // タッチスクロールを完全に防止（モバイル対応）
    const preventTouch = (e: TouchEvent) => {
      e.preventDefault();
    };
    
    // イベントリスナーを追加
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', preventScroll);
    document.addEventListener('wheel', preventWheel, { passive: false });
    document.addEventListener('touchmove', preventTouch, { passive: false });
    
    return () => {
      // 背景操作を再有効化
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      
      // イベントリスナーを削除
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', preventScroll);
      document.removeEventListener('wheel', preventWheel);
      document.removeEventListener('touchmove', preventTouch);
    };
  }, [onClose]);

  return (
    <div className="status-priority-modal-backdrop" onClick={handleBackdropClick}>
      <div 
        ref={modalRef}
        className="status-priority-modal"
        style={{
          left: position.x,
          top: position.y
        }}
      >
        <div className="modal-header">
          <h3>{type === 'status' ? 'ステータスを選択' : '優先度を選択'}</h3>
        </div>
        <div className="options-grid">
          {options.map((option) => (
            <div
              key={option.value}
              className={`option-card ${type} ${option.value} ${
                currentValue === option.value ? 'selected' : ''
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="option-label">{option.label}</span>
              {currentValue === option.value && (
                <div className="checkmark">
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusPriorityModal;