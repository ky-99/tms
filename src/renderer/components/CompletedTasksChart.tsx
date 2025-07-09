import React from 'react';

interface DataPoint {
  date: string;
  completed: number;
  planned: number;
}

interface CompletedTasksChartProps {
  data: DataPoint[];
}

const CompletedTasksChart: React.FC<CompletedTasksChartProps> = ({ data }) => {
  const [windowSize, setWindowSize] = React.useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });

  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>データがありません</p>
      </div>
    );
  }

  // チャートの設定 - レスポンシブ対応（windowSizeを使用）
  const getChartDimensions = () => {
    if (windowSize.width <= 480) {
      return { 
        width: Math.min(320, windowSize.width - 40), 
        height: 250, 
        padding: { top: 15, right: 20, bottom: 40, left: 40 } 
      };
    } else if (windowSize.width <= 768) {
      return { 
        width: Math.min(450, windowSize.width - 60), 
        height: 280, 
        padding: { top: 20, right: 30, bottom: 45, left: 50 } 
      };
    } else if (windowSize.width <= 1024) {
      return { 
        width: 500, 
        height: 320, 
        padding: { top: 20, right: 35, bottom: 50, left: 55 } 
      };
    }
    return { 
      width: 600, 
      height: 350, 
      padding: { top: 20, right: 40, bottom: 50, left: 60 } 
    };
  };

  const { width, height, padding } = getChartDimensions();
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // レスポンシブフォントサイズ（windowSizeを使用）
  const getFontSizes = () => {
    if (windowSize.width <= 480) {
      return { axis: 10, data: 9, legend: 10 };
    } else if (windowSize.width <= 768) {
      return { axis: 11, data: 10, legend: 11 };
    }
    return { axis: 12, data: 11, legend: 12 };
  };

  const fontSizes = getFontSizes();

  // データの最大値を取得
  const maxCompleted = Math.max(...data.map(d => d.completed));
  const maxPlanned = Math.max(...data.map(d => d.planned));
  const dataMax = Math.max(maxCompleted, maxPlanned);
  // 適切な目盛り間隔で最大値を設定
  const yMax = dataMax === 0 ? 5 : Math.max(5, Math.ceil(dataMax * 1.2));

  // スケールの計算
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - (value / yMax) * chartHeight;

  // パスの生成（完了タスク用）
  const completedPathData = data
    .map((point, index) => {
      const x = xScale(index) + padding.left;
      const y = yScale(point.completed) + padding.top;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // パスの生成（期日用）
  const plannedPathData = data
    .map((point, index) => {
      const x = xScale(index) + padding.left;
      const y = yScale(point.planned) + padding.top;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // グリッドラインの生成
  const yGridLines = [];
  // 適切な目盛り間隔を計算
  const getTickInterval = (max: number) => {
    if (max <= 5) return 1;
    if (max <= 10) return 2;
    if (max <= 20) return 5;
    if (max <= 50) return 10;
    return Math.ceil(max / 5);
  };
  
  const tickInterval = getTickInterval(yMax);
  const tickCount = Math.ceil(yMax / tickInterval);
  
  for (let i = 0; i <= tickCount; i++) {
    const value = i * tickInterval;
    if (value > yMax) break;
    
    const y = yScale(value) + padding.top;
    yGridLines.push(
      <g key={`grid-${i}`}>
        <line
          x1={padding.left}
          y1={y}
          x2={width - padding.right}
          y2={y}
          stroke="#e5e7eb"
          strokeDasharray="2,2"
        />
        <text
          x={padding.left - 10}
          y={y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={fontSizes.axis}
          fill="#6b7280"
        >
          {value}
        </text>
      </g>
    );
  }

  return (
    <div className="completed-tasks-chart" style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      <svg width={width} height={height}>
        {/* 背景 */}
        <rect width={width} height={height} fill="white" />
        
        {/* Y軸グリッドライン */}
        {yGridLines}
        
        {/* X軸 */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
        />
        
        {/* Y軸 */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
        />
        
        {/* 折れ線グラフ（完了タスク） */}
        <path
          d={completedPathData}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
        />
        
        {/* 折れ線グラフ（期日） */}
        <path
          d={plannedPathData}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
        />
        
        {/* データポイント（完了タスク） */}
        {data.map((point, index) => {
          const x = xScale(index) + padding.left;
          const y = yScale(point.completed) + padding.top;
          
          return (
            <g key={`completed-point-${index}`}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#10b981"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                fontSize={fontSizes.data}
                fill="#10b981"
                fontWeight="600"
              >
                {point.completed}
              </text>
            </g>
          );
        })}
        
        {/* データポイント（期日） */}
        {data.map((point, index) => {
          const x = xScale(index) + padding.left;
          const y = yScale(point.planned) + padding.top;
          
          return (
            <g key={`planned-point-${index}`}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#f97316"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y + 15}
                textAnchor="middle"
                fontSize={fontSizes.data}
                fill="#f97316"
                fontWeight="600"
              >
                {point.planned}
              </text>
            </g>
          );
        })}
        
        {/* X軸ラベル */}
        {data.map((point, index) => {
          const x = xScale(index) + padding.left;
          
          return (
            <text
              key={`label-${index}`}
              x={x}
              y={height - padding.bottom + 35}
              textAnchor="middle"
              fontSize={fontSizes.axis}
              fill="#6b7280"
            >
              {point.date}
            </text>
          );
        })}
        
        {/* 凡例 */}
        <g>
          {/* 完了タスク凡例 */}
          <line
            x1={padding.left + 10}
            y1={padding.top + 10}
            x2={padding.left + 30}
            y2={padding.top + 10}
            stroke="#10b981"
            strokeWidth="3"
          />
          <text
            x={padding.left + 35}
            y={padding.top + 15}
            fontSize={fontSizes.legend}
            fill="#111827"
          >
            完了タスク
          </text>
          
          {/* 期日タスク凡例 */}
          <line
            x1={padding.left + 10}
            y1={padding.top + 30}
            x2={padding.left + 30}
            y2={padding.top + 30}
            stroke="#f97316"
            strokeWidth="3"
          />
          <text
            x={padding.left + 35}
            y={padding.top + 35}
            fontSize={fontSizes.legend}
            fill="#111827"
          >
            期日タスク
          </text>
        </g>
      </svg>
    </div>
  );
};

export default CompletedTasksChart;