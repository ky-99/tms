import React from 'react';
import {
  // Removed unused imports: LineChart, Line
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface DataPoint {
  date: string;
  completed: number;
  planned: number;
}

interface CompletedTasksChartProps {
  data: DataPoint[];
}

const CompletedTasksChart: React.FC<CompletedTasksChartProps> = ({ data }) => {
  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="recharts-custom-tooltip">
          <p className="recharts-tooltip-label">{`${label}`}</p>
          <div className="recharts-tooltip-item-list">
            <div className="recharts-tooltip-item" style={{ color: '#8884d8' }}>
              <span className="recharts-tooltip-item-name">完了: </span>
              <span className="recharts-tooltip-item-value">{payload[0].value}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#82ca9d' }}>
              <span className="recharts-tooltip-item-name">予定: </span>
              <span className="recharts-tooltip-item-value">{payload[1].value}タスク</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip 
            content={<CustomTooltip />}
            animationDuration={0}
            isAnimationActive={false}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          <Legend />
          
          {/* 予定ライン（背景エリア） */}
          <Area
            type="monotone"
            dataKey="planned"
            stroke="#82ca9d"
            strokeWidth={2}
            fill="#82ca9d"
            fillOpacity={0.1}
            name="予定タスク"
          />
          
          {/* 完了エリア（前景） */}
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#8884d8"
            strokeWidth={2}
            fill="#8884d8"
            fillOpacity={0.3}
            name="完了タスク"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CompletedTasksChart;