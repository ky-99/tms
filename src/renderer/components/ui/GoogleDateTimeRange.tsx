import React, { useState } from 'react';
import GoogleDateTimePicker from './GoogleDateTimePicker';

interface GoogleDateTimeRangeProps {
  startValue?: string;
  endValue?: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  disabled?: boolean;
  className?: string;
}

const GoogleDateTimeRange: React.FC<GoogleDateTimeRangeProps> = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  disabled = false,
  className = ''
}) => {
  const [focusedInput, setFocusedInput] = useState<'start' | 'end' | null>(null);

  const handleStartChange = (date: string) => {
    onStartChange(date);
    
    // 開始日時が終了日時より後の場合、終了日時を自動調整
    if (date && endValue) {
      const startDate = new Date(date);
      const endDate = new Date(endValue);
      if (startDate > endDate) {
        // 開始日時の1時間後に設定
        const newEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        onEndChange(newEndDate.toISOString());
      }
    }
  };

  const handleEndChange = (date: string) => {
    onEndChange(date);
    
    // 終了日時が開始日時より前の場合、開始日時を自動調整
    if (date && startValue) {
      const startDate = new Date(startValue);
      const endDate = new Date(date);
      if (endDate < startDate) {
        // 終了日時の1時間前に設定
        const newStartDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        onStartChange(newStartDate.toISOString());
      }
    }
  };

  const formatDisplayValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });
  };

  return (
    <div className={`google-datetime-range ${className}`}>
      <div className="google-datetime-range-container">
        <div className="google-datetime-range-start">
          <GoogleDateTimePicker
            value={startValue}
            onChange={handleStartChange}
            placeholder="開始日時"
            showTimeSelect={true}
            timeIntervals={15}
            disabled={disabled}
            className={focusedInput === 'start' ? 'focused' : ''}
          />
        </div>
        
        <div className="google-datetime-range-separator">
          <span className="range-arrow">→</span>
        </div>
        
        <div className="google-datetime-range-end">
          <GoogleDateTimePicker
            value={endValue}
            onChange={handleEndChange}
            placeholder="終了日時"
            showTimeSelect={true}
            timeIntervals={15}
            disabled={disabled}
            className={focusedInput === 'end' ? 'focused' : ''}
          />
        </div>
      </div>
      
      {/* Google Calendar風の表示 */}
      {(startValue || endValue) && (
        <div className="google-datetime-range-display">
          <span className="range-display-text">
            {startValue && formatDisplayValue(startValue)}
            {startValue && endValue && ' ～ '}
            {endValue && formatDisplayValue(endValue)}
          </span>
        </div>
      )}
    </div>
  );
};

export default GoogleDateTimeRange;