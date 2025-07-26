import { useState, useRef, useCallback, useEffect } from 'react';

interface HoverState {
  taskId: number | null;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const useTaskHover = (delay: number = 750) => {
  const [hoverState, setHoverState] = useState<HoverState>({
    taskId: null,
    position: { x: 0, y: 0 },
    isVisible: false
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((taskId: number, event: React.MouseEvent) => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // イベント情報を事前に取得してキャプチャ
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // 遅延してポップアップを表示
    timeoutRef.current = setTimeout(() => {
      const x = rect.left; // タスクカードの左端に合わせる
      const y = rect.bottom + 5; // タスクカードの下に5pxの間隔で表示
      
      setHoverState({
        taskId,
        position: { x, y },
        isVisible: true
      });
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    // タイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 即座にポップアップを非表示
    setHoverState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    // マウス移動では何もしない（シンプルな実装）
    // ホバー状態の安定性を向上させるため
  }, []);

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHoverState({
      taskId: null,
      position: { x: 0, y: 0 },
      isVisible: false
    });
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    hoverState,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    cleanup
  };
};