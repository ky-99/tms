import React from 'react';

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

  // 今週のタスクのみをフィルタリング（日曜日週始まり）
  const getWeeklyTasks = () => {
    const today = new Date();
    const sunday = new Date(today);
    // 今週の日曜日を取得（週始まり）
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const flatTasks = flattenTasks(tasks);
    return flatTasks.filter(task => {
      const dueDateValue = task.dueDate || task.due_date;
      // 今週期日のタスクのみ
      if (!dueDateValue) return false;
      const dueDate = new Date(dueDateValue);
      return dueDate >= sunday && dueDate <= saturday;
    });
  };

  const weeklyTasks = getWeeklyTasks();
  
  // ステータス別の統計を計算
  const statusStats = {
    completed: 0,
    inProgress: 0,
    pending: 0
  };

  weeklyTasks.forEach(task => {
    if (task.status === 'completed') {
      statusStats.completed++;
    } else if (task.status === 'in_progress') {
      statusStats.inProgress++;
    } else {
      statusStats.pending++;
    }
  });

  const total = statusStats.completed + statusStats.inProgress + statusStats.pending;
  
  if (total === 0) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          今週のタスクがありません
        </div>
      </div>
    );
  }

  // チャートの設定 - レスポンシブ対応（windowSizeを使用）
  const getChartSize = () => {
    const containerWidth = (windowSize.width - 90 - 24) * 0.33;
    if (windowSize.width <= 480) {
      return { size: 120, outerRadius: 40, innerRadius: 18 };
    } else if (windowSize.width <= 768) {
      return { size: 130, outerRadius: 45, innerRadius: 20 };
    } else if (containerWidth < 280 || windowSize.width <= 1050) {
      return { size: 110, outerRadius: 35, innerRadius: 16 };
    } else if (windowSize.width <= 1200) {
      return { size: 130, outerRadius: 45, innerRadius: 20 };
    }
    return { size: 150, outerRadius: 55, innerRadius: 25 };
  };

  const { size, outerRadius, innerRadius } = getChartSize();
  const centerX = size / 2;
  const centerY = size / 2;

  // 角度の計算
  const completedAngle = (statusStats.completed / total) * 360;
  const inProgressAngle = (statusStats.inProgress / total) * 360;
  const pendingAngle = (statusStats.pending / total) * 360;

  // ドーナツ型パスの生成
  const createDonutPath = (startAngle: number, endAngle: number) => {
    // 360度（完全な円）の場合は特別な処理
    if (Math.abs(endAngle - startAngle) >= 360) {
      // 完全な円を2つの半円に分けて描画
      const outerPath1 = [
        "M", centerX - outerRadius, centerY,
        "A", outerRadius, outerRadius, 0, 0, 1, centerX + outerRadius, centerY,
        "A", outerRadius, outerRadius, 0, 0, 1, centerX - outerRadius, centerY
      ].join(" ");
      
      const innerPath1 = [
        "M", centerX - innerRadius, centerY,
        "A", innerRadius, innerRadius, 0, 0, 0, centerX + innerRadius, centerY,
        "A", innerRadius, innerRadius, 0, 0, 0, centerX - innerRadius, centerY
      ].join(" ");
      
      return outerPath1 + " " + innerPath1 + " Z";
    }
    
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
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  let currentAngle = 0;
  const segments = [];

  // 特別な場合：全てが完了（100%の場合）
  if (total > 0 && statusStats.completed === total) {
    segments.push({
      path: '', // 後で円として描画
      color: '#10b981',
      label: '完了',
      count: statusStats.completed,
      percentage: 100,
      isFullCircle: true
    });
  } else {
    // 通常の処理
    // 完了セグメント
    if (statusStats.completed > 0) {
      const path = createDonutPath(currentAngle, currentAngle + completedAngle);
      segments.push({
        path: path,
        color: '#10b981',
        label: '完了',
        count: statusStats.completed,
        percentage: Math.round((statusStats.completed / total) * 100)
      });
      currentAngle += completedAngle;
    }

    // 進行中セグメント
    if (statusStats.inProgress > 0) {
      const path = createDonutPath(currentAngle, currentAngle + inProgressAngle);
      segments.push({
        path: path,
        color: '#f59e0b',
        label: '進行中',
        count: statusStats.inProgress,
        percentage: Math.round((statusStats.inProgress / total) * 100)
      });
      currentAngle += inProgressAngle;
    }

    // 未着手セグメント
    if (statusStats.pending > 0) {
      const path = createDonutPath(currentAngle, currentAngle + pendingAngle);
      segments.push({
        path: path,
        color: '#6b7280',
        label: '未着手',
        count: statusStats.pending,
        percentage: Math.round((statusStats.pending / total) * 100)
      });
    }
  }

  // レスポンシブレイアウト（windowSizeを使用）
  const getLayoutDirection = () => {
    // Calculate if there's enough space for side-by-side layout
    const containerWidth = (windowSize.width - 90 - 24) * 0.33; // Available width for side chart
    if (containerWidth < 280 || windowSize.width <= 1050) {
      return 'column';
    }
    return 'row';
  };

  const flexDirection = getLayoutDirection();

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection, alignItems: 'center', gap: flexDirection === 'column' ? '12px' : '16px', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        {/* 背景 */}
        <rect width={size} height={size} fill="white" />
        
        {/* ドーナツグラフセグメント */}
        {segments.map((segment, index) => {
          // 100%完了の場合は円として描画
          if (segment.isFullCircle) {
            return (
              <g key={index}>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={outerRadius}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                />
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={innerRadius}
                  fill="white"
                />
              </g>
            );
          }
          
          // 通常のパス描画
          return (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        
      </svg>
      
      {/* 表形式の凡例 */}
      <div style={{ flexShrink: 0 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ padding: '3px 6px', textAlign: 'left', color: '#374151', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>ステータス</th>
              <th style={{ padding: '3px 6px', textAlign: 'right', color: '#374151', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>件数</th>
              <th style={{ padding: '3px 6px', textAlign: 'right', color: '#374151', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>割合</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment, index) => (
              <tr key={index}>
                <td style={{ padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      backgroundColor: segment.color, 
                      borderRadius: '2px' 
                    }}
                  />
                  <span style={{ color: '#374151' }}>{segment.label}</span>
                </td>
                <td style={{ padding: '3px 6px', textAlign: 'right', color: '#6b7280' }}>{segment.count}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', color: '#6b7280' }}>{segment.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskStatusPieChart;