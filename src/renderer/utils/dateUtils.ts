/**
 * Date utility functions
 * Centralizes date logic scattered across components
 */

/**
 * Gets the current week's date range (Sunday to Saturday)
 * Replaces duplicate week calculation logic across components
 */
export const getCurrentWeekRange = () => {
  const today = new Date();
  const sunday = new Date(today);
  
  // Get this week's Sunday (start of week)
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  
  return { start: sunday, end: saturday };
};

/**
 * Gets all dates in the current week
 */
export const getCurrentWeekDates = (): Date[] => {
  const { start } = getCurrentWeekRange();
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

/**
 * Checks if a date is in the current week
 */
export const isInCurrentWeek = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const { start, end } = getCurrentWeekRange();
  
  return targetDate >= start && targetDate <= end;
};

/**
 * Formats a date for display
 */
export const formatDate = (
  date: Date | string, 
  format: 'short' | 'medium' | 'long' | 'weekday' = 'medium'
): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
    case 'medium':
      return targetDate.toLocaleDateString('ja-JP');
    case 'long':
      return targetDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'weekday':
      return targetDate.toLocaleDateString('ja-JP', { weekday: 'short' });
    default:
      return targetDate.toLocaleDateString('ja-JP');
  }
};

/**
 * Gets relative time text (e.g., "2時間前", "3日後")
 */
export const getRelativeTime = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (Math.abs(diffMinutes) < 1) return 'たった今';
  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `${diffMinutes}分後` : `${Math.abs(diffMinutes)}分前`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours}時間後` : `${Math.abs(diffHours)}時間前`;
  }
  if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `${diffDays}日後` : `${Math.abs(diffDays)}日前`;
  }
  
  return formatDate(targetDate);
};

/**
 * Checks if a date is today
 */
export const isToday = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    targetDate.getDate() === today.getDate() &&
    targetDate.getMonth() === today.getMonth() &&
    targetDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Checks if a date is in the past
 */
export const isPast = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate < today;
};

/**
 * Gets the start and end of a given day
 */
export const getDayRange = (date: Date | string) => {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};