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
  hideTimeWhenDateOnly?: boolean; // 日付のみの場合に時刻フィールドを非表示
}

const GoogleSeparatedDateTimePicker: React.FC<GoogleSeparatedDateTimePickerProps> = ({
  value,
  onChange,
  placeholder = '日時を選択',
  className = '',
  disabled = false,
  showTime = true,
  timeInterval = 15,
  hideTimeWhenDateOnly = false
}) => {
  // datetime-local形式の文字列から日付と時間を分離
  const parseDateTime = (datetimeString: string) => {
    if (!datetimeString) return { date: '', time: '' };
    
    // 時刻のみの形式 "THH:MM" をチェック
    if (datetimeString.startsWith('T') && !datetimeString.includes('-')) {
      return { 
        date: '', 
        time: datetimeString.substring(1, 6) // "THH:MM" から "HH:MM" を抽出
      };
    }
    
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
    // 空文字や無効な時刻の場合は時刻を削除
    if (!newTime || newTime.trim() === '') {
      if (date) {
        // 日付のみを保持（分離スキーマでは日付のみの形式で通知）
        onChange(date);
      } else {
        // 日付も時刻もない場合は空文字
        onChange('');
      }
      return;
    }
    
    // 日付が未設定の場合は時刻のみを設定（日付は自動補完しない）
    if (!date) {
      // 時刻のみの変更として通知（疎結合対応）
      onChange(`T${newTime}`);
    } else {
      // 日付と時刻の両方がある場合は結合
      const newDateTime = combineDateTime(date, newTime);
      onChange(newDateTime);
    }
  };

  // 表示用フォーマット（ローカル時間で安全に処理）
  const formatDisplay = () => {
    if (!value) return placeholder;
    
    const { date: dateStr, time: timeStr } = parseDateTime(value);
    
    // 日付も時刻もない場合
    if (!dateStr && !timeStr) return placeholder;
    
    // 時刻のみの場合
    if (!dateStr && timeStr) {
      return showTime ? timeStr : placeholder;
    }
    
    // 日付のみの場合
    if (dateStr && !timeStr) {
      const [year, month, day] = dateStr.split('-');
      return `${year}/${month}/${day}`;
    }
    
    // 日付と時刻両方ある場合
    const [year, month, day] = dateStr.split('-');
    const formattedDate = `${year}/${month}/${day}`;
    
    if (!showTime) return formattedDate;
    
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
      
      {showTime && (!hideTimeWhenDateOnly || (value && value.includes('T'))) && (
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