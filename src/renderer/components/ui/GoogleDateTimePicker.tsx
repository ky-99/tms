import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface GoogleDateTimePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  showTimeSelect?: boolean;
  timeIntervals?: number;
  dateFormat?: string;
  className?: string;
  disabled?: boolean;
}

// カスタム入力コンポーネント
const CustomInput = forwardRef<HTMLDivElement, any>(({ value, onClick, placeholder, disabled }, ref) => (
  <div 
    ref={ref}
    className={`google-datetime-input ${disabled ? 'disabled' : ''}`}
    onClick={onClick}
    tabIndex={0}
    role="button"
    aria-label="日時を選択"
  >
    <span className="google-datetime-value">
      {value || placeholder || '日時を設定'}
    </span>
  </div>
));

CustomInput.displayName = 'CustomInput';

const GoogleDateTimePicker: React.FC<GoogleDateTimePickerProps> = ({
  value,
  onChange,
  placeholder = '日時を設定',
  showTimeSelect = true,
  timeIntervals = 15,
  dateFormat = showTimeSelect ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = value ? new Date(value) : null;

  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date.toISOString());
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

  return (
    <div className={`google-datetime-picker ${className}`} onClick={handleInputClick}>
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        showTimeSelect={showTimeSelect}
        timeIntervals={timeIntervals}
        dateFormat={dateFormat}
        customInput={<CustomInput placeholder={placeholder} disabled={disabled} />}
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        onCalendarClose={() => setIsOpen(false)}
        onSelect={() => setIsOpen(false)}
        calendarClassName="google-datetime-calendar"
        popperClassName="google-datetime-popper"
        popperPlacement="bottom-start"
        locale="ja"
        timeCaption="時刻"
        todayButton="今日"
        clearButtonTitle="クリア"
        disabled={disabled}
        // Google Calendar風の設定
        inline={false}
        fixedHeight
        showPopperArrow={false}
        enableTabLoop={false}
        autoComplete="off"
      />
    </div>
  );
};

export default GoogleDateTimePicker;