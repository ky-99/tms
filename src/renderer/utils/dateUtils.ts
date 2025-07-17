/**
 * 日付関連のユーティリティ関数
 */

/**
 * 日付を相対的な文字列に変換
 */
export const formatRelativeDate = (date: Date | string): string => {
  const targetDate = new Date(date);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今日';
  } else if (diffDays === 1) {
    return '明日';
  } else if (diffDays === -1) {
    return '昨日';
  } else if (diffDays > 0) {
    return `${diffDays}日後`;
  } else {
    return `${Math.abs(diffDays)}日前`;
  }
};

/**
 * 日付を日本語形式でフォーマット
 */
export const formatJapaneseDate = (date: Date | string): string => {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  
  return `${year}年${month}月${day}日`;
};

/**
 * 日付をISO形式（YYYY-MM-DD）でフォーマット
 */
export const formatDateForInput = (date: Date | string | null): string => {
  if (!date) return '';
  const targetDate = new Date(date);
  return targetDate.toISOString().split('T')[0];
};

/**
 * 期限日が過ぎているかチェック
 */
export const isOverdue = (dueDate: Date | string | null): boolean => {
  if (!dueDate) return false;
  const targetDate = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate < now;
};

/**
 * 今日が期限日かチェック
 */
export const isDueToday = (dueDate: Date | string | null): boolean => {
  if (!dueDate) return false;
  const targetDate = new Date(dueDate);
  const now = new Date();
  
  return targetDate.toDateString() === now.toDateString();
};

/**
 * 明日が期限日かチェック
 */
export const isDueTomorrow = (dueDate: Date | string | null): boolean => {
  if (!dueDate) return false;
  const targetDate = new Date(dueDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return targetDate.toDateString() === tomorrow.toDateString();
};