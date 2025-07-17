import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
  // Removed unused import: Cell
} from 'recharts';

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  due_date?: string;
  completedAt?: string;
  completed_at?: string;
  children?: Task[];
}

interface PriorityProgressChartProps {
  tasks: Task[];
}

const PriorityProgressChart: React.FC<PriorityProgressChartProps> = ({ tasks }) => {
  // 優先度の色設定
  const PRIORITY_COLORS = {
    urgent: '#ef4444',  // 赤色 - 緊急
    high: '#f59e0b',    // オレンジ色 - 高
    medium: '#3b82f6',  // 青色 - 中
    low: '#6b7280'      // グレー色 - 低
  };

  const PRIORITY_LABELS = {
    urgent: '緊急',
    high: '高',
    medium: '中',
    low: '低'
  };

  // 全タスクを平坦化
  const flattenTasks = (taskList: Task[]): Task[] => {
    const result: Task[] = [];
    
    const addTask = (task: Task) => {
      result.push(task);
      if (task.children) {
        task.children.forEach(addTask);
      }
    };
    
    taskList.forEach(addTask);
    return result;
  };

  // 優先度別の進行データを計算
  const priorityData = useMemo(() => {
    const allTasks = flattenTasks(tasks);
    const priorityStats = {
      urgent: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      high: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      medium: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      low: { total: 0, completed: 0, in_progress: 0, pending: 0 }
    };

    allTasks.forEach(task => {
      const priority = task.priority as keyof typeof priorityStats;
      if (priority in priorityStats) {
        priorityStats[priority].total++;
        if (task.status === 'completed') {
          priorityStats[priority].completed++;
        } else if (task.status === 'in_progress') {
          priorityStats[priority].in_progress++;
        } else {
          priorityStats[priority].pending++;
        }
      }
    });

    return Object.entries(priorityStats)
      .filter(([_, stats]) => stats.total > 0) // タスクが存在する優先度のみ
      .map(([priority, stats]) => ({
        name: PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS],
        completed: stats.completed,
        in_progress: stats.in_progress,
        pending: stats.pending,
        total: stats.total,
        color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS],
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }));
  }, [tasks]);

  // カスタムラベル（各バーの上に完了率を表示）
  const CustomLabel = ({ x, y, width, payload }: any) => {
    if (!payload || payload.completionRate === undefined) {
      return null;
    }
    
    const completionRate = payload.completionRate;
    
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill="#666" 
        textAnchor="middle" 
        fontSize="12"
        fontWeight="500"
      >
        {completionRate}%
      </text>
    );
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="recharts-custom-tooltip">
          <p className="recharts-tooltip-label">{`${label}優先度`}</p>
          <div className="recharts-tooltip-item-list">
            <div className="recharts-tooltip-item" style={{ color: '#10b981' }}>
              <span className="recharts-tooltip-item-name">完了: </span>
              <span className="recharts-tooltip-item-value">{data.completed}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#3b82f6' }}>
              <span className="recharts-tooltip-item-name">進行中: </span>
              <span className="recharts-tooltip-item-value">{data.in_progress}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#9ca3af' }}>
              <span className="recharts-tooltip-item-name">未着手: </span>
              <span className="recharts-tooltip-item-value">{data.pending}タスク</span>
            </div>
            <div className="recharts-tooltip-item" style={{ color: '#666' }}>
              <span className="recharts-tooltip-item-name">完了率: </span>
              <span className="recharts-tooltip-item-value">{data.completionRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (priorityData.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        タスクがありません
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '240px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={priorityData}
          margin={{
            top: 30,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'タスク数', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={<CustomTooltip />}
            animationDuration={0}
            isAnimationActive={false}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          
          {/* 積み上げ棒グラフ */}
          <Bar dataKey="completed" stackId="a" fill="#10b981" name="完了" />
          <Bar dataKey="in_progress" stackId="a" fill="#3b82f6" name="進行中" />
          <Bar dataKey="pending" stackId="a" fill="#9ca3af" name="未着手" label={<CustomLabel />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriorityProgressChart;