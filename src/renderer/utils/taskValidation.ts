import { parseISO, addMinutes, isAfter, isBefore } from 'date-fns';

export interface TaskValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TaskTimeValidationOptions {
  startDate: string | null;
  endDate: string | null;
  minimumDurationMinutes?: number;
}

/**
 * タスクの時間バリデーションを実行
 */
export function validateTaskTime(options: TaskTimeValidationOptions): TaskValidationResult {
  const { startDate, endDate, minimumDurationMinutes = 15 } = options;
  const errors: string[] = [];

  // 開始日時と終了日時が両方設定されている場合のみバリデーション
  if (startDate && endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // 終了日時が開始日時より前の場合
    if (isBefore(end, start)) {
      errors.push('終了日時は開始日時より後である必要があります。');
    }

    // 最低時間間隔をチェック
    const minimumEnd = addMinutes(start, minimumDurationMinutes);
    if (isBefore(end, minimumEnd)) {
      errors.push(`タスクの最低時間は${minimumDurationMinutes}分です。`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 時間を調整してバリデーションを通るようにする
 */
export function adjustTaskTime(options: TaskTimeValidationOptions): {
  startDate: string | undefined;
  endDate: string | undefined;
  adjusted: boolean;
} {
  const { startDate, endDate, minimumDurationMinutes = 15 } = options;
  let adjusted = false;

  if (!startDate || !endDate) {
    return { startDate: startDate || undefined, endDate: endDate || undefined, adjusted };
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  let newStart = start;
  let newEnd = end;

  // 終了日時が開始日時より前の場合、または最低時間間隔を下回る場合、終了日時を開始日時+15分に調整
  if (isBefore(end, start)) {
    newEnd = addMinutes(start, minimumDurationMinutes);
    adjusted = true;
  }

  // 最低時間間隔をチェック
  const minimumEnd = addMinutes(newStart, minimumDurationMinutes);
  if (isBefore(newEnd, minimumEnd)) {
    newEnd = addMinutes(newStart, minimumDurationMinutes); // 開始日時+15分に設定
    adjusted = true;
  }

  return {
    startDate: newStart.toISOString(),
    endDate: newEnd.toISOString(),
    adjusted,
  };
}

/**
 * リサイズ時のバリデーション（TimelineView用）
 */
export function validateTaskResize(
  originalStartDate: string,
  originalEndDate: string,
  newStartDate: string,
  newEndDate: string,
  minimumDurationMinutes: number = 15
): TaskValidationResult {
  const errors: string[] = [];

  const newStart = parseISO(newStartDate);
  const newEnd = parseISO(newEndDate);

  // 終了日時が開始日時より前の場合
  if (isBefore(newEnd, newStart)) {
    errors.push('終了日時は開始日時より後である必要があります。');
  }

  // 最低時間間隔をチェック
  const minimumEnd = addMinutes(newStart, minimumDurationMinutes);
  if (isBefore(newEnd, minimumEnd)) {
    errors.push(`タスクの最低時間は${minimumDurationMinutes}分です。`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}