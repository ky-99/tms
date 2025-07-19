import React from 'react';
import GoogleSeparatedDateTimePicker from './GoogleSeparatedDateTimePicker';

interface GoogleSeparatedDateTimeRangeProps {
  startValue?: string;
  endValue?: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  disabled?: boolean;
  className?: string;
  timeInterval?: number;
}

const GoogleSeparatedDateTimeRange: React.FC<GoogleSeparatedDateTimeRangeProps> = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  disabled = false,
  className = '',
  timeInterval = 15
}) => {
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

  const formatRangeDisplay = () => {
    if (!startValue && !endValue) return '';
    
    const formatSingle = (value: string) => {
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

    const start = startValue ? formatSingle(startValue) : '';
    const end = endValue ? formatSingle(endValue) : '';
    
    if (start && end) {
      return `${start} ～ ${end}`;
    } else if (start) {
      return `${start} から`;
    } else if (end) {
      return `${end} まで`;
    }
    
    return '';
  };

  return (
    <div className={`google-separated-datetime-range ${className}`}>
      <div className="separated-range-container">
        <div className="separated-range-start">
          <div className="separated-range-label">開始</div>
          <GoogleSeparatedDateTimePicker
            value={startValue}
            onChange={handleStartChange}
            placeholder="開始日時"
            showTime={true}
            timeInterval={timeInterval}
            disabled={disabled}
          />
        </div>
        
        <div className="separated-range-separator">
          <span className="range-arrow">→</span>
        </div>
        
        <div className="separated-range-end">
          <div className="separated-range-label">終了</div>
          <GoogleSeparatedDateTimePicker
            value={endValue}
            onChange={handleEndChange}
            placeholder="終了日時"
            showTime={true}
            timeInterval={timeInterval}
            disabled={disabled}
          />
        </div>
      </div>
      
      {/* 範囲表示 */}
      {(startValue || endValue) && (
        <div className="separated-range-display">
          <span className="separated-range-display-text">
            {formatRangeDisplay()}
          </span>
        </div>
      )}
    </div>
  );
};

export default GoogleSeparatedDateTimeRange;