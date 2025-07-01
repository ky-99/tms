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
  children?: Task[];
}

interface PriorityProgressChartProps {
  tasks: Task[];
}

const PriorityProgressChart: React.FC<PriorityProgressChartProps> = ({ tasks }) => {
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
      if (!dueDateValue) return false;
      const dueDate = new Date(dueDateValue);
      return dueDate >= sunday && dueDate <= saturday;
    });
  };

  const weeklyTasks = getWeeklyTasks();
  
  // 重要度別の統計を計算
  const priorityStats = {
    urgent: { total: 0, completed: 0 },
    high: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    low: { total: 0, completed: 0 }
  };

  weeklyTasks.forEach(task => {
    const priority = task.priority as keyof typeof priorityStats;
    if (priorityStats[priority]) {
      priorityStats[priority].total++;
      if (task.status === 'completed') {
        priorityStats[priority].completed++;
      }
    }
  });

  // チャートの設定 - レスポンシブ対応（windowSizeを使用）
  const getChartDimensions = () => {
    // Calculate container width more precisely - considering sidebar and padding
    const containerWidth = (windowSize.width - 90 - 24) * 0.33; // sidebar(90px) + padding(24px) + 1/3 of remaining
    
    if (windowSize.width <= 480) {
      const availableWidth = Math.max(180, Math.min(containerWidth - 20, 250));
      return { width: availableWidth, height: 180, barHeight: 6, barSpacing: 40, padding: { top: 20, right: 25, bottom: 10, left: 10 } };
    } else if (windowSize.width <= 768) {
      const availableWidth = Math.max(200, Math.min(containerWidth - 30, 270));
      return { width: availableWidth, height: 200, barHeight: 7, barSpacing: 45, padding: { top: 25, right: 30, bottom: 15, left: 15 } };
    } else if (windowSize.width <= 1024) {
      const availableWidth = Math.max(220, Math.min(containerWidth - 30, 290));
      return { width: availableWidth, height: 220, barHeight: 8, barSpacing: 50, padding: { top: 30, right: 35, bottom: 18, left: 20 } };
    } else if (windowSize.width <= 1100) {
      // Special case for around 1049px width
      const availableWidth = Math.max(240, Math.min(containerWidth - 30, 300));
      return { width: availableWidth, height: 230, barHeight: 9, barSpacing: 52, padding: { top: 32, right: 40, bottom: 18, left: 20 } };
    } else if (windowSize.width <= 1200) {
      const availableWidth = Math.max(260, Math.min(containerWidth - 30, 320));
      return { width: availableWidth, height: 230, barHeight: 9, barSpacing: 52, padding: { top: 32, right: 45, bottom: 18, left: 20 } };
    }
    return { width: 340, height: 240, barHeight: 10, barSpacing: 55, padding: { top: 35, right: 50, bottom: 20, left: 20 } };
  };

  const { width, height, barHeight, barSpacing, padding } = getChartDimensions();

  // レスポンシブフォントサイズ（windowSizeを使用）
  const getFontSizes = () => {
    if (windowSize.width <= 480) {
      return { label: 10, progress: 9 };
    } else if (windowSize.width <= 768) {
      return { label: 11, progress: 10 };
    }
    return { label: 12, progress: 11 };
  };

  const fontSizes = getFontSizes();

  const priorityLabels = {
    urgent: '緊急',
    high: '高',
    medium: '中',
    low: '低'
  };

  const priorityColors = {
    urgent: '#10b981',
    high: '#10b981',
    medium: '#10b981',
    low: '#10b981'
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
      <svg width={width} height={height}>
        {/* 背景 */}
        <rect width={width} height={height} fill="white" />
        
        {Object.entries(priorityStats).map(([priority, stats], index) => {
          const y = padding.top + index * barSpacing;
          const maxBarWidth = width - padding.left - padding.right;
          const progressWidth = stats.total > 0 ? (stats.completed / stats.total) * maxBarWidth : 0;
          const progressPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          
          return (
            <g key={priority}>
              {/* 重要度ラベル（バーの上） */}
              <text
                x={padding.left}
                y={y - 5}
                textAnchor="start"
                alignmentBaseline="baseline"
                fontSize={fontSizes.label}
                fill="#374151"
                fontWeight="500"
              >
                {priorityLabels[priority as keyof typeof priorityLabels]}
              </text>
              
              {/* 進行度テキスト（バーの上、右寄せ） */}
              <text
                x={padding.left + maxBarWidth}
                y={y - 5}
                textAnchor="end"
                alignmentBaseline="baseline"
                fontSize={fontSizes.progress}
                fill="#374151"
                fontWeight="600"
              >
                {progressPercentage}% ({stats.completed}/{stats.total})
              </text>
              
              {/* 背景バー */}
              <rect
                x={padding.left}
                y={y}
                width={maxBarWidth}
                height={barHeight}
                fill="#f3f4f6"
                rx={barHeight / 2}
              />
              
              {/* 進行度バー */}
              <rect
                x={padding.left}
                y={y}
                width={progressWidth}
                height={barHeight}
                fill={priorityColors[priority as keyof typeof priorityColors]}
                rx={barHeight / 2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default PriorityProgressChart;