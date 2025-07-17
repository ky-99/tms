/**
 * アプリケーション全体で使用される定数
 */

// ステータス定数
export const TASK_STATUSES = {
  PENDING: 'pending' as const,
  IN_PROGRESS: 'in_progress' as const,
  COMPLETED: 'completed' as const
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUSES.PENDING]: '未着手',
  [TASK_STATUSES.IN_PROGRESS]: '進行中',
  [TASK_STATUSES.COMPLETED]: '完了'
} as const;

// 優先度定数
export const TASK_PRIORITIES = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  URGENT: 'urgent' as const
};

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITIES.LOW]: '低',
  [TASK_PRIORITIES.MEDIUM]: '中',
  [TASK_PRIORITIES.HIGH]: '高',
  [TASK_PRIORITIES.URGENT]: '緊急'
} as const;

// 色定数
export const STATUS_COLORS = {
  [TASK_STATUSES.PENDING]: '#6b7280',
  [TASK_STATUSES.IN_PROGRESS]: '#3b82f6',
  [TASK_STATUSES.COMPLETED]: '#10b981'
} as const;

export const PRIORITY_COLORS = {
  [TASK_PRIORITIES.LOW]: '#6b7280',
  [TASK_PRIORITIES.MEDIUM]: '#3b82f6',
  [TASK_PRIORITIES.HIGH]: '#f59e0b',
  [TASK_PRIORITIES.URGENT]: '#ef4444'
} as const;

// ルーティンタスク関連定数
export const ROUTINE_TYPES = {
  DAILY: 'daily' as const,
  WEEKLY: 'weekly' as const,
  MONTHLY: 'monthly' as const
};

export const ROUTINE_TYPE_LABELS = {
  [ROUTINE_TYPES.DAILY]: '毎日',
  [ROUTINE_TYPES.WEEKLY]: '毎週',
  [ROUTINE_TYPES.MONTHLY]: '毎月'
} as const;

// UI関連定数
export const UI_CONSTANTS = {
  MODAL_ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  BLUR_TIMEOUT_DELAY: 150,
  TOAST_DURATION: 3000,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000
} as const;

// 日付関連定数
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  JAPANESE_DATE: 'YYYY年MM月DD日',
  DISPLAY_DATE: 'MM/DD'
} as const;

// エラーメッセージ定数
export const ERROR_MESSAGES = {
  TASK_NOT_FOUND: 'タスクが見つかりません',
  TASK_CREATE_FAILED: 'タスクの作成に失敗しました',
  TASK_UPDATE_FAILED: 'タスクの更新に失敗しました',
  TASK_DELETE_FAILED: 'タスクの削除に失敗しました',
  TITLE_REQUIRED: 'タイトルは必須です',
  TITLE_TOO_LONG: `タイトルは${UI_CONSTANTS.MAX_TITLE_LENGTH}文字以内で入力してください`,
  DESCRIPTION_TOO_LONG: `説明は${UI_CONSTANTS.MAX_DESCRIPTION_LENGTH}文字以内で入力してください`,
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  UNKNOWN_ERROR: '予期しないエラーが発生しました'
} as const;

// 成功メッセージ定数
export const SUCCESS_MESSAGES = {
  TASK_CREATED: 'タスクを作成しました',
  TASK_UPDATED: 'タスクを更新しました',
  TASK_DELETED: 'タスクを削除しました',
  TASK_COMPLETED: 'タスクを完了しました',
  TASK_MERGED: 'タスクを統合しました',
  TASK_DUPLICATED: 'タスクを複製しました'
} as const;