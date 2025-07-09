import React from 'react';
import '../styles/status-priority-modal.css';

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
  const statusOptions = [
    { value: 'pending', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' },
    { value: 'cancelled', label: 'キャンセル' }
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

  return (
    <div className="status-priority-modal-backdrop" onClick={handleBackdropClick}>
      <div 
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