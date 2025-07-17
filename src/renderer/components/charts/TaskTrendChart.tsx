import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { formatDate, addDays, subDays } from '../../utils';
import { Task } from '../../types';
import { flattenTasks } from '../../utils/taskUtils';

interface TaskTrendChartProps {
  tasks: Task[];
}

const TaskTrendChart: React.FC<TaskTrendChartProps> = ({ tasks }) => {
  // 全タスクを平坦化（utilityから使用）

  // 過去30日間のタスクトレンドデータを計算
  const trendData = useMemo(() => {
    const allTasks = flattenTasks(tasks);
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29);
    
    const data = [];
    
    for (let i = 0; i < 30; i++) {
      const currentDate = addDays(thirtyDaysAgo, i);
      const dateStr = formatDate(currentDate, 'short');
      
      // その日に作成されたタスク数
      const createdCount = allTasks.filter(task => {
        const createdAt = task.createdAt;
        if (!createdAt) return false;
        
        const createdDate = new Date(createdAt);
        return (
          createdDate.getFullYear() === currentDate.getFullYear() &&
          createdDate.getMonth() === currentDate.getMonth() &&
          createdDate.getDate() === currentDate.getDate()
        );
      }).length;
      
      // その日に完了されたタスク数
      const completedCount = allTasks.filter(task => {
        const completedAt = task.completedAt;
        if (!completedAt || task.status !== 'completed') return false;
        
        const completedDate = new Date(completedAt);
        return (
          completedDate.getFullYear() === currentDate.getFullYear() &&
          completedDate.getMonth() === currentDate.getMonth() &&
          completedDate.getDate() === currentDate.getDate()
        );
      }).length;
      
      // 累積作成タスク数（その日の終了時刻まで含める）
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const cumulativeCreated = allTasks.filter(task => {
        const createdAt = task.createdAt;
        if (!createdAt) return false;
        
        const createdDate = new Date(createdAt);
        return createdDate <= endOfDay;
      }).length;
      
      // 累積完了タスク数（その日の終了時刻まで含める）
      const cumulativeCompleted = allTasks.filter(task => {
        const completedAt = task.completedAt;
        if (!completedAt || task.status !== 'completed') return false;
        
        const completedDate = new Date(completedAt);
        return completedDate <= endOfDay;
      }).length;
      
      data.push({
        date: dateStr,
        created: createdCount,
        completed: completedCount,
        cumulativeCreated,
        cumulativeCompleted,
        productivity: createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0
      });
    }
    
    return data;
  }, [tasks]);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="recharts-custom-tooltip">
          <p className="recharts-tooltip-label">{`${label}`}</p>
          <div className="recharts-tooltip-item-list">
            <div className="recharts-tooltip-item" style={{ color: '#3b82f6' }}>
              <span className="recharts-tooltip-item-name">作成: </span>
              <span className="recharts-tooltip-item-value">{data.created}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#10b981' }}>
              <span className="recharts-tooltip-item-name">完了: </span>
              <span className="recharts-tooltip-item-value">{data.completed}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#f97316' }}>
              <span className="recharts-tooltip-item-name">累積作成: </span>
              <span className="recharts-tooltip-item-value">{data.cumulativeCreated}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#dc2626' }}>
              <span className="recharts-tooltip-item-name">累積完了: </span>
              <span className="recharts-tooltip-item-value">{data.cumulativeCompleted}タスク</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (trendData.every(d => d.created === 0 && d.completed === 0)) {
    return (
      <div style={{ 
        width: '100%', 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        過去30日間のデータがありません
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={trendData}
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
            tick={{ fontSize: 11 }}
            stroke="#666"
            interval="preserveStartEnd"
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'タスク数', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: '累積', angle: 90, position: 'insideRight' }}
          />
          <Tooltip 
            content={<CustomTooltip />}
            animationDuration={0}
            isAnimationActive={false}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          <Legend />
          
          {/* 累積エリアチャート */}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeCreated"
            fill="#f97316"
            fillOpacity={0.1}
            stroke="#f97316"
            strokeWidth={1}
            name="累積作成"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeCompleted"
            fill="#dc2626"
            fillOpacity={0.1}
            stroke="#dc2626"
            strokeWidth={1}
            name="累積完了"
          />
          
          {/* 日別ライン */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="created"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
            name="日別作成"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="completed"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            name="日別完了"
          />
          
          {/* 基準線 */}
          <ReferenceLine yAxisId="left" y={0} stroke="#ddd" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TaskTrendChart;