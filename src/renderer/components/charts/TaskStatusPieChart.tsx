import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
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
  createdAt?: string;
  created_at?: string;
  children?: Task[];
}

interface TaskStatusPieChartProps {
  tasks: Task[];
}

const TaskStatusPieChart: React.FC<TaskStatusPieChartProps> = ({ tasks }) => {
  // タスクステータスの色設定
  const COLORS = {
    pending: '#9ca3af',     // 灰色 - 未着手
    in_progress: '#3b82f6', // 青色 - 進行中
    completed: '#10b981'    // 緑色 - 完了
  };

  const STATUS_LABELS = {
    pending: '未着手',
    in_progress: '進行中',
    completed: '完了'
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

  // ステータス別のタスク数を計算
  const statusData = useMemo(() => {
    const allTasks = flattenTasks(tasks);
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0
    };

    allTasks.forEach(task => {
      if (task.status in statusCounts) {
        statusCounts[task.status as keyof typeof statusCounts]++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
      value: count,
      status: status,
      color: COLORS[status as keyof typeof COLORS]
    })).filter(item => item.value > 0); // 0のデータは除外
  }, [tasks]);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="recharts-custom-tooltip">
          <p className="recharts-tooltip-label">{data.name}</p>
          <div className="recharts-tooltip-item-list">
            <div className="recharts-tooltip-item" style={{ color: data.color }}>
              <span className="recharts-tooltip-item-value">{data.value}タスク</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // カスタムラベル - ラベル位置を内側に調整
  const renderLabel = (entry: any) => {
    const total = statusData.reduce((sum, item) => sum + item.value, 0);
    const percent = ((entry.value / total) * 100).toFixed(1);
    // パーセンテージが小さい場合はラベルを非表示にして見切れを防ぐ
    return parseFloat(percent) < 5 ? '' : `${percent}%`;
  };

  if (statusData.length === 0) {
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
    <div style={{ width: '100%', height: '280px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            innerRadius={30}
            outerRadius={70}
            fill="#8884d8"
            dataKey="value"
          >
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            content={<CustomTooltip />}
            animationDuration={0}
            isAnimationActive={false}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TaskStatusPieChart;