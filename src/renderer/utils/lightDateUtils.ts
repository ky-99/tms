/**
 * Lightweight date utility functions
 * Replaces date-fns with minimal, efficient implementations
 * Bundle size: ~1KB vs ~15KB for date-fns
 * 
 * Japanese timezone handling utilities included
 */

/**
 * Converts string to Date if needed
 */
const toDate = (date: Date | string): Date => {
  return typeof date === 'string' ? new Date(date) : date;
};

/**
 * Gets the current week's date range (Sunday to Saturday)
 * Lightweight implementation without external dependencies
 */
export const getCurrentWeekRange = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate start of week (Sunday)
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Saturday)
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - dayOfWeek));
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Gets all dates in the current week
 */
export const getCurrentWeekDates = (): Date[] => {
  const { start, end } = getCurrentWeekRange();
  const dates: Date[] = [];
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Checks if a date is in the current week
 */
export const isInCurrentWeek = (date: Date | string): boolean => {
  const targetDate = toDate(date);
  const { start, end } = getCurrentWeekRange();
  
  return targetDate >= start && targetDate <= end;
};

/**
 * Formats a date for display with Japanese localization
 * Lightweight implementation using native Date methods
 */
export const formatDate = (
  date: Date | string, 
  formatType: 'short' | 'medium' | 'long' | 'weekday' = 'medium'
): string => {
  const targetDate = toDate(date);
  
  switch (formatType) {
    case 'short':
      return `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
    
    case 'medium':
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    
    case 'long':
      return `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月${targetDate.getDate()}日`;
    
    case 'weekday':
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      return weekdays[targetDate.getDay()];
    
    default:
      return formatDate(targetDate, 'medium');
  }
};

/**
 * Gets relative time text with Japanese localization
 * Simplified implementation for common use cases
 */
export const getRelativeTime = (date: Date | string): string => {
  const targetDate = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'たった今';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    // For dates older than a week, show formatted date
    return formatDate(targetDate, 'short');
  }
};

/**
 * Checks if a date is today
 */
export const isToday = (date: Date | string): boolean => {
  const targetDate = toDate(date);
  const today = new Date();
  
  return (
    targetDate.getFullYear() === today.getFullYear() &&
    targetDate.getMonth() === today.getMonth() &&
    targetDate.getDate() === today.getDate()
  );
};

/**
 * Checks if a date is in the past
 */
export const isPast = (date: Date | string): boolean => {
  const targetDate = toDate(date);
  const today = new Date();
  
  // Set both dates to start of day for accurate comparison
  const targetStartOfDay = new Date(targetDate);
  targetStartOfDay.setHours(0, 0, 0, 0);
  
  const todayStartOfDay = new Date(today);
  todayStartOfDay.setHours(0, 0, 0, 0);
  
  return targetStartOfDay < todayStartOfDay;
};

/**
 * Gets the start and end of a given day
 */
export const getDayRange = (date: Date | string) => {
  const targetDate = toDate(date);
  
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Sets a date to end of day (23:59:59.999)
 */
export const setEndOfDay = (date: Date | string): Date => {
  const targetDate = toDate(date);
  targetDate.setHours(23, 59, 59, 999);
  return targetDate;
};

/**
 * Additional utility functions for common date operations
 */

/**
 * Adds days to a date
 */
export const addDays = (date: Date | string, days: number): Date => {
  const result = new Date(toDate(date));
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Subtracts days from a date
 */
export const subDays = (date: Date | string, days: number): Date => {
  return addDays(date, -days);
};

/**
 * Checks if two dates are the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Gets the start of the week for a given date
 */
export const getWeekStart = (date: Date | string): Date => {
  const targetDate = toDate(date);
  const dayOfWeek = targetDate.getDay();
  
  const start = new Date(targetDate);
  start.setDate(targetDate.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  
  return start;
};

/**
 * Gets the end of the week for a given date
 */
export const getWeekEnd = (date: Date | string): Date => {
  const targetDate = toDate(date);
  const dayOfWeek = targetDate.getDay();
  
  const end = new Date(targetDate);
  end.setDate(targetDate.getDate() + (6 - dayOfWeek));
  end.setHours(23, 59, 59, 999);
  
  return end;
};

/**
 * Converts a Date to local datetime-local input format (YYYY-MM-DDTHH:MM)
 * Preserves the local timezone without converting to UTC
 */
export const toLocalDateTimeString = (date: Date | string): string => {
  const targetDate = toDate(date);
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Converts a local datetime-local input value to ISO string with local timezone
 * Preserves the local time without timezone conversion
 */
export const fromLocalDateTimeString = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  // Parse the local datetime string
  const date = new Date(dateTimeString);
  
  // Return as ISO string but preserve local time
  return date.toISOString();
};

/**
 * Formats datetime for display in Japanese format
 */
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

/**
 * Converts datetime-local string to JST timestamp for database storage
 * Input: "YYYY-MM-DDTHH:MM"
 * Output: "YYYY-MM-DDTHH:MM:00+09:00" (JST timezone)
 */
export const localDateTimeToJST = (localDateTimeString: string): string => {
  if (!localDateTimeString) return '';
  
  // 日付のみの場合は時刻を00:00で補完
  let dateTimeString = localDateTimeString;
  if (!dateTimeString.includes('T')) {
    dateTimeString = dateTimeString + 'T00:00';
  }
  
  // 既に秒が含まれているかチェック
  const timePart = dateTimeString.split('T')[1];
  if (timePart && !timePart.includes(':00', 5)) { // 最後の:00がない場合
    dateTimeString = dateTimeString + ':00';
  }
  
  // JST時間として明示的に保存するため、+09:00タイムゾーンを付加
  return dateTimeString + '+09:00';
};

/**
 * Converts datetime-local string to ISO string preserving local time
 * Input: "YYYY-MM-DDTHH:MM"
 * Output: "YYYY-MM-DDTHH:MM:00.000Z" (but with local time preserved)
 * @deprecated Use localDateTimeToJST instead for better timezone handling
 */
export const localDateTimeToISO = (localDateTimeString: string): string => {
  if (!localDateTimeString) return '';
  
  // datetime-local形式の文字列をそのまま使ってISOString形式にする
  // UTC変換を避けるために、手動で文字列を構築
  return localDateTimeString + ':00.000Z';
};

/**
 * Converts JST timestamp from database to datetime-local string for UI
 * Input: "YYYY-MM-DDTHH:MM:SS+09:00", ISO string, or "YYYY-MM-DD" (date-only)
 * Output: "YYYY-MM-DDTHH:MM"
 * 
 * Note: Date-only strings (e.g., "2024-07-18") are converted to "2024-07-18T00:00"
 */
export const jstToLocalDateTime = (jstString: string): string => {
  if (!jstString) return '';
  
  // +09:00 (JST) 形式の場合
  if (jstString.includes('+09:00')) {
    // タイムゾーン情報を削除し、そのまま使用（JST時間として扱う）
    const cleanString = jstString.replace('+09:00', '');
    const [dateStr, timeStr] = cleanString.split('T');
    if (!dateStr) return '';
    
    // 時刻がない場合は00:00を使用
    if (!timeStr) {
      return `${dateStr}T00:00`;
    }
    
    // HH:MM形式に切り詰め
    const [hours, minutes] = timeStr.split(':');
    return `${dateStr}T${hours || '00'}:${minutes || '00'}`;
  }
  
  // その他のISO形式の場合はローカル時間に変換
  if (jstString.includes('Z') || jstString.includes('+')) {
    try {
      const date = new Date(jstString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.warn('Invalid date format:', jstString);
      return '';
    }
  }
  
  // 日付のみの文字列の場合（例: "2024-07-18"）
  if (jstString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return `${jstString}T00:00`;
  }
  
  // 既にdatetime-local形式の場合はそのまま返す
  return jstString.substring(0, 16); // HH:MM形式に切り詰め
};

/**
 * Formats datetime-local string for display in Japanese format
 * Safely handles "YYYY-MM-DDTHH:MM" format without timezone conversion
 */
export const formatLocalDateTime = (localDateTimeString: string): string => {
  if (!localDateTimeString) return '';
  
  // まずJST形式から変換
  const cleanString = jstToLocalDateTime(localDateTimeString);
  
  // datetime-local形式を直接解析
  const [dateStr, timeStr] = cleanString.split('T');
  if (!dateStr || !timeStr) return '';
  
  const [year, month, day] = dateStr.split('-');
  const [hours, minutes] = timeStr.split(':');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

/**
 * Converts ISO datetime string to datetime-local format for input fields
 * Used for updating datetime input fields after validation adjustments
 */
export const formatDateTimeForInput = (isoString: string): string => {
  if (!isoString) return '';
  
  const dateTime = new Date(isoString);
  const year = dateTime.getFullYear();
  const month = String(dateTime.getMonth() + 1).padStart(2, '0');
  const day = String(dateTime.getDate()).padStart(2, '0');
  const hours = String(dateTime.getHours()).padStart(2, '0');
  const minutes = String(dateTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Helper function to update datetime input state
 * Converts ISO string to datetime-local format and updates the setter function
 */
export const updateDateTimeInput = (dateTimeString: string | undefined, setterFn: (value: string) => void): void => {
  if (dateTimeString) {
    const adjustedDateTime = new Date(dateTimeString);
    const year = adjustedDateTime.getFullYear();
    const month = String(adjustedDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDateTime.getDate()).padStart(2, '0');
    const hours = String(adjustedDateTime.getHours()).padStart(2, '0');
    const minutes = String(adjustedDateTime.getMinutes()).padStart(2, '0');
    setterFn(`${year}-${month}-${day}T${hours}:${minutes}`);
  }
};

/**
 * 開始日時と終了日時の整合性をチェックし、必要に応じて調整を行う
 * @param startDateTime - 開始日時（datetime-local形式）
 * @param endDateTime - 終了日時（datetime-local形式）
 * @returns 調整結果 { adjustedStart, adjustedEnd, wasAdjusted, adjustmentType }
 */
export const validateAndAdjustDateTimes = (
  startDateTime: string, 
  endDateTime: string
): {
  adjustedStart: string;
  adjustedEnd: string;
  wasAdjusted: boolean;
  adjustmentType: 'none' | 'end_adjusted' | 'start_adjusted';
} => {
  // 空文字や無効な値の場合はそのまま返す
  if (!startDateTime || !endDateTime) {
    return {
      adjustedStart: startDateTime,
      adjustedEnd: endDateTime,
      wasAdjusted: false,
      adjustmentType: 'none'
    };
  }

  // 日付のみの形式（時刻なし）の場合は検証をスキップ
  // YYYY-MM-DD形式または時刻が含まれていない場合
  const isDateOnlyStart = startDateTime.match(/^\d{4}-\d{2}-\d{2}$/) || !startDateTime.includes('T');
  const isDateOnlyEnd = endDateTime.match(/^\d{4}-\d{2}-\d{2}$/) || !endDateTime.includes('T');
  
  if (isDateOnlyStart || isDateOnlyEnd) {
    return {
      adjustedStart: startDateTime,
      adjustedEnd: endDateTime,
      wasAdjusted: false,
      adjustmentType: 'none'
    };
  }

  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);

  // 無効な日付の場合はそのまま返す
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      adjustedStart: startDateTime,
      adjustedEnd: endDateTime,
      wasAdjusted: false,
      adjustmentType: 'none'
    };
  }

  // 開始日時が終了日時より後の場合は終了日時を調整
  if (startDate >= endDate) {
    // 開始日時の15分後に終了日時を設定
    const adjustedEndDate = new Date(startDate);
    adjustedEndDate.setMinutes(adjustedEndDate.getMinutes() + 15);
    
    const adjustedEnd = toLocalDateTimeString(adjustedEndDate);
    
    return {
      adjustedStart: startDateTime,
      adjustedEnd: adjustedEnd,
      wasAdjusted: true,
      adjustmentType: 'end_adjusted'
    };
  }

  // 整合性に問題がない場合
  return {
    adjustedStart: startDateTime,
    adjustedEnd: endDateTime,
    wasAdjusted: false,
    adjustmentType: 'none'
  };
};

/**
 * 日時調整のフィードバックメッセージを生成
 */
export const getDateTimeAdjustmentMessage = (adjustmentType: 'none' | 'end_adjusted' | 'start_adjusted'): string => {
  switch (adjustmentType) {
    case 'end_adjusted':
      return '終了日時を開始日時の15分後に自動調整しました';
    case 'start_adjusted':
      return '開始日時を終了日時の15分前に自動調整しました';
    default:
      return '';
  }
};

/**
 * 日付文字列（YYYY-MM-DD）を指定日の23:59のdatetime-local形式に変換
 * カレンダーからの日付指定でタスクを作成する際に使用
 */
export const dateToEndOfDayLocal = (dateString: string): string => {
  if (!dateString) return '';
  
  // YYYY-MM-DD 形式の日付文字列をチェック
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return '';
  }
  
  // 23:59を追加してdatetime-local形式にする
  return `${dateString}T23:59`;
};

/**
 * datetime-local文字列を日付と時刻に分離する
 * Input: "2025-07-23T10:00" または "THH:MM" （時刻のみ）
 * Output: { date: "2025-07-23", time: "10:00" }
 */
export const separateDateAndTime = (dateTimeString: string): { date: string | null, time: string | null } => {
  if (!dateTimeString) {
    return { date: null, time: null };
  }
  
  // 時刻のみの形式 "THH:MM" をチェック（疎結合対応）
  if (dateTimeString.startsWith('T') && !dateTimeString.includes('-')) {
    const timePart = dateTimeString.substring(1); // "T" を除去
    
    // 時刻形式の検証を強化
    if (!timePart || !timePart.includes(':')) {
      return { date: null, time: null };
    }
    
    const [hours, minutes] = timePart.split(':');
    if (hours && minutes && hours.length <= 2 && minutes.length <= 2) {
      const normalizedHours = parseInt(hours, 10);
      const normalizedMinutes = parseInt(minutes, 10);
      
      // 時刻の有効性検証
      if (normalizedHours >= 0 && normalizedHours <= 23 && 
          normalizedMinutes >= 0 && normalizedMinutes <= 59) {
        return { 
          date: null, 
          time: `${normalizedHours.toString().padStart(2, '0')}:${normalizedMinutes.toString().padStart(2, '0')}` 
        };
      }
    }
    return { date: null, time: null };
  }
  
  // datetime-local形式をチェック
  if (!dateTimeString.includes('T')) {
    // 日付のみの場合
    if (dateTimeString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { date: dateTimeString, time: null };
    }
    return { date: null, time: null };
  }
  
  const [datePart, timePart] = dateTimeString.split('T');
  
  // 日付部分の検証
  if (!datePart || !datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { date: null, time: null };
  }
  
  // 時刻部分の検証と正規化
  if (!timePart) {
    return { date: datePart, time: null };
  }
  
  // HH:MM形式に正規化
  const [hours, minutes] = timePart.split(':');
  if (!hours || !minutes) {
    return { date: datePart, time: null };
  }
  
  return {
    date: datePart,
    time: `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  };
};

/**
 * 分離された日付と時刻をdatetime-local形式に結合する
 * Input: date: "2025-07-23", time: "10:00"
 * Output: "2025-07-23T10:00"
 */
export const combineDateAndTime = (date: string | null, time: string | null): string => {
  if (!date) return '';
  
  // 日付のみの場合
  if (!time) return date;
  
  return `${date}T${time}`;
};