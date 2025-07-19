import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface GoogleDatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// カスタム入力コンポーネント
const CustomInput = forwardRef<HTMLDivElement, any>(({ value, onClick, placeholder, disabled }, ref) => (
  <div 
    ref={ref}
    className={`google-date-input ${disabled ? 'disabled' : ''}`}
    onClick={disabled ? undefined : onClick}
    tabIndex={disabled ? -1 : 0}
    role="button"
    aria-label="日付を選択"
    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
  >
    <span className="google-date-value">
      {value || placeholder || '日付を選択'}
    </span>
  </div>
));

CustomInput.displayName = 'CustomInput';

const GoogleDatePicker: React.FC<GoogleDatePickerProps> = ({
  value,
  onChange,
  placeholder = '日付を選択',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value || value.trim() === '') return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }, [value]);

  const handleChange = (date: Date | null) => {
    if (date) {
      // 日付のみを ISO 文字列として返す
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      onChange(formattedDate);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // 表示用の日付フォーマット
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className={`google-date-picker ${className}`} onClick={handleInputClick}>
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        showTimeSelect={false}
        dateFormat="yyyy年M月d日"
        customInput={
          <CustomInput 
            value={selectedDate ? formatDisplayDate(value || '') : ''} 
            placeholder={placeholder} 
            disabled={disabled} 
          />
        }
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        onCalendarClose={() => setIsOpen(false)}
        onSelect={() => setIsOpen(false)}
        calendarClassName="google-date-calendar"
        popperClassName="google-date-popper"
        popperPlacement="bottom-start"
        locale="ja"
        todayButton="今日"
        disabled={disabled}
        inline={false}
        fixedHeight
        showPopperArrow={false}
        enableTabLoop={false}
        autoComplete="off"
      />
    </div>
  );
};

export default GoogleDatePicker;