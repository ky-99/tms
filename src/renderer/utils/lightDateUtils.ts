/**
 * Lightweight date utility functions
 * Replaces date-fns with minimal, efficient implementations
 * Bundle size: ~1KB vs ~15KB for date-fns
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