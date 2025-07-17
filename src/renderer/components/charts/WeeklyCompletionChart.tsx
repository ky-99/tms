import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Task } from '../../types';
import { flattenTasks } from '../../utils/taskUtils';

interface WeeklyCompletionChartProps {
  tasks: Task[];
}

const WeeklyCompletionChart: React.FC<WeeklyCompletionChartProps> = ({ tasks }) => {
  // 全タスクを平坦化（utilityから使用）

  // 曜日別完了タスク数を計算
  const weeklyData = useMemo(() => {
    const allTasks = flattenTasks(tasks);
    const completedTasks = allTasks.filter(task => 
      task.status === 'completed' && (task.completedAt)
    );

    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayStats = Array(7).fill(0);

    completedTasks.forEach(task => {
      const completedAt = task.completedAt;
      if (completedAt) {
        const date = new Date(completedAt);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        dayStats[dayOfWeek]++;
      }
    });

    return dayNames.map((day, index) => ({
      day,
      completed: dayStats[index],
      isWeekend: index === 0 || index === 6
    }));
  }, [tasks]);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="recharts-custom-tooltip">
          <p className="recharts-tooltip-label">{`${label}曜日`}</p>
          <div className="recharts-tooltip-item-list">
            <div className="recharts-tooltip-item" style={{ color: '#3b82f6' }}>
              <span className="recharts-tooltip-item-name">完了タスク: </span>
              <span className="recharts-tooltip-item-value">{data.completed}個</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // カスタムバー色関数
  const getBarColor = (entry: any) => {
    return entry.isWeekend ? '#f59e0b' : '#3b82f6';
  };

  if (weeklyData.every(d => d.completed === 0)) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        完了タスクのデータがありません
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={weeklyData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: '完了数', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={<CustomTooltip />}
            animationDuration={0}
            isAnimationActive={false}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          
          <Bar dataKey="completed" name="完了タスク">
            {weeklyData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyCompletionChart;