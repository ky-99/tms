import { useRef, useCallback } from 'react';

export interface ScrollManagerHook {
  scrollPositionRef: React.RefObject<number>;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  calendarSectionRef: React.RefObject<HTMLDivElement | null>;
  saveScrollPosition: () => void;
  restoreScrollPosition: () => void;
}

export const useScrollManager = (): ScrollManagerHook => {
  const scrollPositionRef = useRef<number>(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const calendarSectionRef = useRef<HTMLDivElement>(null);

  // スクロール位置を保存する関数（カレンダー基準）
  const saveScrollPosition = useCallback(() => {
    if (calendarSectionRef.current && mainContentRef.current) {
      const calendarRect = calendarSectionRef.current.getBoundingClientRect();
      const containerRect = mainContentRef.current.getBoundingClientRect();
      
      // カレンダーセクションの上端までの距離を保存
      scrollPositionRef.current = calendarRect.top - containerRect.top + mainContentRef.current.scrollTop;
    } else if (mainContentRef.current) {
      scrollPositionRef.current = mainContentRef.current.scrollTop;
    } else {
      scrollPositionRef.current = window.scrollY;
    }
  }, []);

  // スクロール位置を復元する関数（カレンダー基準）
  const restoreScrollPosition = useCallback(() => {
    if (calendarSectionRef.current && mainContentRef.current && scrollPositionRef.current > 0) {
      // カレンダーセクションが基準位置に来るようにスクロール
      setTimeout(() => {
        if (calendarSectionRef.current && mainContentRef.current) {
          const calendarRect = calendarSectionRef.current.getBoundingClientRect();
          const containerRect = mainContentRef.current.getBoundingClientRect();
          const currentCalendarPosition = calendarRect.top - containerRect.top + mainContentRef.current.scrollTop;
          const targetCalendarPosition = scrollPositionRef.current;
          const scrollAdjustment = currentCalendarPosition - targetCalendarPosition;
          
          mainContentRef.current.scrollTop = mainContentRef.current.scrollTop - scrollAdjustment;
        }
      }, 10);
    } else if (mainContentRef.current && scrollPositionRef.current > 0) {
      setTimeout(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 10);
    } else if (scrollPositionRef.current > 0) {
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current);
      }, 10);
    }
  }, []);

  return {
    scrollPositionRef,
    mainContentRef,
    calendarSectionRef,
    saveScrollPosition,
    restoreScrollPosition
  };
};