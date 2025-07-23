import React, { useState, useRef, useEffect } from 'react';

interface GoogleTimePickerProps {
  value?: string; // "HH:mm" format
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  interval?: number; // 分単位のインターバル (default: 15)
}

const GoogleTimePicker: React.FC<GoogleTimePickerProps> = ({
  value,
  onChange,
  placeholder = '時刻を選択',
  className = '',
  disabled = false,
  interval = 15
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(value || '');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // valueプロパティの変更を監視してselectedTimeを更新
  useEffect(() => {
    setSelectedTime(value || '');
  }, [value]);

  // 時間オプションを生成
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // 時刻文字列を正規化する関数（0905 → 09:05）
  const normalizeTimeInput = (input: string): string | null => {
    // 数字のみを抽出
    const numbers = input.replace(/\D/g, '');
    
    if (numbers.length === 0) return null;
    
    let hours: string;
    let minutes: string;
    
    if (numbers.length === 1 || numbers.length === 2) {
      // 1桁または2桁の場合は時間として解釈
      hours = numbers.padStart(2, '0');
      minutes = '00';
    } else if (numbers.length === 3) {
      // 3桁の場合：最初の1桁が時間、残り2桁が分
      hours = numbers[0].padStart(2, '0');
      minutes = numbers.slice(1);
    } else if (numbers.length === 4) {
      // 4桁の場合：最初の2桁が時間、残り2桁が分
      hours = numbers.slice(0, 2);
      minutes = numbers.slice(2);
    } else {
      // 5桁以上は無効
      return null;
    }
    
    const hourNum = parseInt(hours);
    const minuteNum = parseInt(minutes);
    
    // 有効な時刻かチェック
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return null;
    }
    
    return `${hours}:${minutes}`;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    onChange(time);
    setIsOpen(false);
    setIsEditing(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      if (isEditing) {
        setIsEditing(false);
        setIsOpen(true);
      } else {
        setIsOpen(!isOpen);
      }
    }
  };

  const handleEditClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!disabled) {
      setIsEditing(true);
      setIsOpen(false);
      setInputValue(selectedTime);
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 0);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputSubmit = () => {
    // 空文字の場合は時刻をクリア
    if (!inputValue || inputValue.trim() === '') {
      setSelectedTime('');
      onChange('');
      setIsEditing(false);
      return;
    }
    
    const normalizedTime = normalizeTimeInput(inputValue);
    if (normalizedTime) {
      setSelectedTime(normalizedTime);
      onChange(normalizedTime);
      setIsEditing(false);
    } else {
      // 無効な入力の場合は元の値に戻して編集モードを終了
      setInputValue(selectedTime || '');
      setIsEditing(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete/Backspaceキーのイベント伝播を止める
      e.stopPropagation();
    }
  };

  const handleInputBlur = () => {
    handleInputSubmit();
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr; // 24時間表示のままで表示
  };

  // 外部クリックでドロップダウンまたは編集モードを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (isEditing && textInputRef.current && !textInputRef.current.contains(event.target as Node)) {
        handleInputSubmit();
      }
    };

    if (isOpen || isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isEditing]);

  // コンポーネントのアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 選択された時間をスクロールで表示
  useEffect(() => {
    if (isOpen && selectedTime && dropdownRef.current) {
      const selectedIndex = timeOptions.indexOf(selectedTime);
      if (selectedIndex !== -1) {
        const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  }, [isOpen, selectedTime, timeOptions]);

  return (
    <div className={`google-time-picker ${className}`}>
      {isEditing ? (
        <input
          ref={textInputRef}
          type="text"
          className="google-time-text-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder=""
          disabled={disabled}
        />
      ) : (
        <div 
          ref={inputRef}
          className={`google-time-input ${disabled ? 'disabled' : ''} ${isEditing ? 'editing' : ''}`}
          onClick={handleEditClick}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label="時間を選択"
          style={{ cursor: disabled ? 'not-allowed' : 'text' }}
        >
          <span className="google-time-value">
            {selectedTime ? formatDisplayTime(selectedTime) : placeholder}
          </span>
        </div>
      )}
      
      {isOpen && !disabled && !isEditing && (
        <div ref={dropdownRef} className="google-time-dropdown">
          <div className="google-time-options">
            {timeOptions.map((time) => (
              <div
                key={time}
                className={`google-time-option ${selectedTime === time ? 'selected' : ''}`}
                onClick={() => handleTimeSelect(time)}
              >
                {formatDisplayTime(time)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleTimePicker;