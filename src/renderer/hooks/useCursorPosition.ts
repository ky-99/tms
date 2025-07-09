/**
 * カーソル位置管理用のカスタムフック
 * テキストエリアや入力フィールドのカーソル位置を自然に制御する
 */

import { useCallback } from 'react';

export interface CursorPositionOptions {
  /** カーソルを末尾に配置するか（デフォルト: true） */
  moveToEnd?: boolean;
  /** カーソルを先頭に配置するか */
  moveToStart?: boolean;
  /** 特定の位置にカーソルを配置 */
  position?: number;
  /** テキスト全体を選択するか */
  selectAll?: boolean;
}

export const useCursorPosition = () => {
  /**
   * テキストエリアまたは入力フィールドのカーソル位置を設定
   */
  const setCursorPosition = useCallback((
    element: HTMLTextAreaElement | HTMLInputElement,
    options: CursorPositionOptions = {}
  ) => {
    const {
      moveToEnd = true,
      moveToStart = false,
      position,
      selectAll = false
    } = options;

    if (!element) return;

    // フォーカスを設定
    element.focus();

    // 次のフレームで実行してDOMの更新を待つ
    requestAnimationFrame(() => {
      const textLength = element.value.length;

      if (selectAll) {
        // テキスト全体を選択
        element.setSelectionRange(0, textLength);
      } else if (typeof position === 'number') {
        // 特定の位置にカーソルを配置
        const safePosition = Math.max(0, Math.min(position, textLength));
        element.setSelectionRange(safePosition, safePosition);
      } else if (moveToStart) {
        // 先頭にカーソルを配置
        element.setSelectionRange(0, 0);
      } else if (moveToEnd) {
        // 末尾にカーソルを配置（デフォルト）
        element.setSelectionRange(textLength, textLength);
      }
    });
  }, []);

  /**
   * 自然なカーソル位置を設定（編集開始時の標準的な動作）
   */
  const setNaturalCursorPosition = useCallback((
    element: HTMLTextAreaElement | HTMLInputElement,
    editType: 'append' | 'edit' | 'replace' = 'append'
  ) => {
    if (editType === 'append') {
      // 追記モード: 末尾にカーソル
      setCursorPosition(element, { moveToEnd: true });
    } else if (editType === 'edit') {
      // 編集モード: 末尾にカーソル（最も自然）
      setCursorPosition(element, { moveToEnd: true });
    } else if (editType === 'replace') {
      // 置換モード: 全選択
      setCursorPosition(element, { selectAll: true });
    }
  }, [setCursorPosition]);

  /**
   * Refコールバック用のヘルパー関数
   */
  const createCursorRef = useCallback((
    options: CursorPositionOptions = {}
  ) => {
    return (element: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (element) {
        // より自然なカーソル位置設定のために少し遅延を追加
        setTimeout(() => {
          if (element.value.length === 0) {
            // 空の場合は先頭
            setCursorPosition(element, { moveToStart: true });
          } else {
            // 内容がある場合は末尾
            setCursorPosition(element, { moveToEnd: true });
          }
        }, 10);
      }
    };
  }, [setCursorPosition]);

  return {
    setCursorPosition,
    setNaturalCursorPosition,
    createCursorRef
  };
};

export default useCursorPosition;