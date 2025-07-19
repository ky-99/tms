import React from 'react';
import GoogleDatePicker from './GoogleDatePicker';
import GoogleTimePicker from './GoogleTimePicker';

interface GoogleSeparatedDateTimePickerProps {
  value?: string; // ISO string
  onChange: (datetime: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTime?: boolean;
  timeInterval?: number;
}

const GoogleSeparatedDateTimePicker: React.FC<GoogleSeparatedDateTimePickerProps> = ({
  value,
  onChange,
  placeholder = '日時を選択',
  className = '',
  disabled = false,
  showTime = true,
  timeInterval = 15
}) => {
  // datetime-local形式の文字列から日付と時間を分離
  const parseDateTime = (datetimeString: string) => {
    if (!datetimeString) return { date: '', time: '' };
    
    // datetime-local形式 "YYYY-MM-DDTHH:MM" または ISO形式を処理
    let cleanString = datetimeString;
    if (datetimeString.includes('Z') || datetimeString.includes('+')) {
      // ISO形式の場合はローカル時間に変換
      const date = new Date(datetimeString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      cleanString = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    const [dateStr, timeStr] = cleanString.split('T');
    return { 
      date: dateStr || '', 
      time: timeStr ? timeStr.substring(0, 5) : '' // HH:MM形式に切り詰め
    };
  };

  // 日付と時間を組み合わせてdatetime-local形式を作成
  const combineDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '';
    
    // 時刻が指定されていない場合は時刻なしの日付のみを返す
    if (!timeStr) return dateStr;
    return `${dateStr}T${timeStr}`;
  };

  const { date, time } = parseDateTime(value || '');

  const handleDateChange = (newDate: string) => {
    const newDateTime = combineDateTime(newDate, time);
    onChange(newDateTime);
  };

  const handleTimeChange = (newTime: string) => {
    if (!date) {
      // 日付が未設定の場合は今日の日付を使用
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const newDateTime = combineDateTime(todayStr, newTime);
      onChange(newDateTime);
    } else {
      const newDateTime = combineDateTime(date, newTime);
      onChange(newDateTime);
    }
  };

  // 表示用フォーマット（ローカル時間で安全に処理）
  const formatDisplay = () => {
    if (!value) return placeholder;
    
    const { date: dateStr, time: timeStr } = parseDateTime(value);
    if (!dateStr) return placeholder;
    
    // 日付を手動でフォーマット
    const [year, month, day] = dateStr.split('-');
    const formattedDate = `${year}/${month}/${day}`;
    
    if (!showTime || !timeStr) return formattedDate;
    
    return `${formattedDate} ${timeStr}`;
  };

  return (
    <div className={`google-separated-datetime ${className}`}>
      <div className="google-separated-date">
        <GoogleDatePicker
          value={date}
          onChange={handleDateChange}
          placeholder="日付を選択"
          disabled={disabled}
        />
      </div>
      
      {showTime && (
        <div className="google-separated-time">
          <GoogleTimePicker
            value={time}
            onChange={handleTimeChange}
            placeholder="時刻を選択"
            disabled={disabled}
            interval={timeInterval}
          />
        </div>
      )}
    </div>
  );
};

export default GoogleSeparatedDateTimePicker;