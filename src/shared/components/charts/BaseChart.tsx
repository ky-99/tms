/**
 * Chart系コンポーネントの基底クラス
 * 
 * 思考プロセス：
 * 1. 重複するレスポンシブロジックを統合
 * 2. ウィンドウリサイズイベントの最適化
 * 3. 共通のチャート設定を抽象化
 * 4. パフォーマンス最適化（防止すべき再レンダリング）
 */

import React, { useState, useEffect, useMemo } from 'react';

// ===== Types =====
export interface ChartDimensions {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface FontSizes {
  axis: number;
  data: number;
  legend: number;
  title: number;
}

export interface BaseChartProps {
  title?: string;
  data: any;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: boolean;
  theme: 'light' | 'dark';
}

// ===== Hook: Responsive Window Size =====
export const useResponsiveWindowSize = () => {
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 防止：過度な再レンダリングのためのデバウンス
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return windowSize;
};

// ===== Utility Functions =====
export const getResponsiveChartDimensions = (windowWidth: number, chartType: 'line' | 'pie' | 'bar' = 'line'): ChartDimensions => {
  // 共通の計算ロジックを統合
  const breakpoints = {
    mobile: 480,
    tablet: 768,
    laptop: 1024,
    desktop: 1200
  };

  if (windowWidth <= breakpoints.mobile) {
    return {
      width: Math.min(320, windowWidth - 40),
      height: chartType === 'pie' ? 120 : 250,
      padding: chartType === 'pie' 
        ? { top: 10, right: 10, bottom: 10, left: 10 }
        : { top: 15, right: 20, bottom: 40, left: 40 }
    };
  }

  if (windowWidth <= breakpoints.tablet) {
    return {
      width: Math.min(450, windowWidth - 60),
      height: chartType === 'pie' ? 130 : 280,
      padding: chartType === 'pie'
        ? { top: 15, right: 15, bottom: 15, left: 15 }
        : { top: 20, right: 30, bottom: 45, left: 50 }
    };
  }

  if (windowWidth <= breakpoints.laptop) {
    return {
      width: chartType === 'pie' ? 110 : 500,
      height: chartType === 'pie' ? 110 : 320,
      padding: chartType === 'pie'
        ? { top: 20, right: 20, bottom: 20, left: 20 }
        : { top: 20, right: 35, bottom: 50, left: 55 }
    };
  }

  // Desktop
  return {
    width: chartType === 'pie' ? 150 : 600,
    height: chartType === 'pie' ? 150 : 350,
    padding: chartType === 'pie'
      ? { top: 25, right: 25, bottom: 25, left: 25 }
      : { top: 20, right: 40, bottom: 50, left: 60 }
  };
};

export const getResponsiveFontSizes = (windowWidth: number): FontSizes => {
  if (windowWidth <= 480) {
    return { axis: 10, data: 9, legend: 10, title: 14 };
  }
  if (windowWidth <= 768) {
    return { axis: 11, data: 10, legend: 11, title: 16 };
  }
  return { axis: 12, data: 11, legend: 12, title: 18 };
};

// ===== Base Chart Component =====
export interface BaseChartComponentProps extends BaseChartProps {
  chartType?: 'line' | 'pie' | 'bar';
  children: (props: {
    dimensions: ChartDimensions;
    fontSizes: FontSizes;
    windowSize: { width: number; height: number };
    isEmpty: boolean;
  }) => React.ReactNode;
}

export const BaseChart: React.FC<BaseChartComponentProps> = ({
  title,
  data,
  loading = false,
  error,
  emptyMessage = 'データがありません',
  className = '',
  style = {},
  chartType = 'line',
  children
}) => {
  const windowSize = useResponsiveWindowSize();
  
  // メモ化された計算値
  const dimensions = useMemo(() => 
    getResponsiveChartDimensions(windowSize.width, chartType), 
    [windowSize.width, chartType]
  );
  
  const fontSizes = useMemo(() => 
    getResponsiveFontSizes(windowSize.width), 
    [windowSize.width]
  );

  const isEmpty = useMemo(() => {
    if (!data) return true;
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') return Object.keys(data).length === 0;
    return false;
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className={`chart-container loading ${className}`} style={style}>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>チャートを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`chart-container error ${className}`} style={style}>
        <div className="chart-error">
          <p>⚠️ チャートの読み込みに失敗しました</p>
          <small>{error}</small>
        </div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className={`chart-container empty ${className}`} style={style}>
        <div className="chart-empty">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-container ${className}`} style={style}>
      {title && (
        <h3 className="chart-title" style={{ fontSize: fontSizes.title }}>
          {title}
        </h3>
      )}
      {children({ dimensions, fontSizes, windowSize, isEmpty })}
    </div>
  );
};

// ===== Higher-Order Component =====
export const withChartResponsiveness = <P extends object>(
  WrappedComponent: React.ComponentType<P & {
    dimensions: ChartDimensions;
    fontSizes: FontSizes;
    windowSize: { width: number; height: number };
  }>
) => {
  return React.memo((props: P & { chartType?: 'line' | 'pie' | 'bar' }) => {
    const windowSize = useResponsiveWindowSize();
    const dimensions = useMemo(() => 
      getResponsiveChartDimensions(windowSize.width, props.chartType), 
      [windowSize.width, props.chartType]
    );
    const fontSizes = useMemo(() => 
      getResponsiveFontSizes(windowSize.width), 
      [windowSize.width]
    );

    return (
      <WrappedComponent
        {...props}
        dimensions={dimensions}
        fontSizes={fontSizes}
        windowSize={windowSize}
      />
    );
  });
};

// ===== Chart-specific Utilities =====

/**
 * SVGパス生成ユーティリティ
 */
export const createSVGPath = {
  line: (points: Array<{ x: number; y: number }>, smooth = false): string => {
    if (points.length === 0) return '';
    
    const pathData = points.map((point, index) => {
      const command = index === 0 ? 'M' : (smooth ? 'S' : 'L');
      return `${command} ${point.x} ${point.y}`;
    });
    
    return pathData.join(' ');
  },

  donut: (
    centerX: number, 
    centerY: number, 
    outerRadius: number, 
    innerRadius: number, 
    startAngle: number, 
    endAngle: number
  ): string => {
    const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: cx + (radius * Math.cos(angleInRadians)),
        y: cy + (radius * Math.sin(angleInRadians))
      };
    };

    const outerStart = polarToCartesian(centerX, centerY, outerRadius, endAngle);
    const outerEnd = polarToCartesian(centerX, centerY, outerRadius, startAngle);
    const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
    const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", outerStart.x, outerStart.y,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  }
};

/**
 * カラーパレット
 */
export const chartColors = {
  primary: '#8b5cf6',
  success: '#10b981', 
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  secondary: '#6b7280',
  routine: '#ffcc80',
  completed: '#d1fae5',
  
  gradient: {
    purple: ['#8b5cf6', '#7c3aed'],
    green: ['#10b981', '#059669'],
    orange: ['#f59e0b', '#d97706'],
    blue: ['#3b82f6', '#2563eb']
  }
};