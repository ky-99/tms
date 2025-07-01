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

interface Tag {
  id: number;
  name: string;
  color: string;
  textColor?: string;
  createdAt: Date;
}

interface TagProgressChartProps {
  tasks: Task[];
}

const TagProgressChart: React.FC<TagProgressChartProps> = ({ tasks }) => {
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [taskTags, setTaskTags] = React.useState<Map<number, Tag[]>>(new Map());
  const [windowSize, setWindowSize] = React.useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });

  React.useEffect(() => {
    loadTagsData();
  }, [tasks]);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const loadTagsData = async () => {
    try {
      const allTags = await window.taskAPI.getAllTags();
      setTags(allTags);

      // Load tags for all tasks
      const flatTasks = flattenTasks(tasks);
      const taskTagsMap = new Map<number, Tag[]>();
      
      for (const task of flatTasks) {
        try {
          const taskTagList = await window.taskAPI.getTagsByTaskId(task.id);
          taskTagsMap.set(task.id, taskTagList);
        } catch (error) {
          console.error(`Failed to load tags for task ${task.id}:`, error);
        }
      }
      
      setTaskTags(taskTagsMap);
    } catch (error) {
      console.error('Failed to load tags data:', error);
    }
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

  // 今週の期日タスクのみをフィルタリング（日曜日週始まり）
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
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate >= sunday && dueDate <= saturday;
    });
  };

  const weeklyTasks = getWeeklyTasks();

  // タグ別の統計を計算
  const calculateTagStats = () => {
    const tagStats = new Map<number, { tag: Tag; total: number; completed: number }>();

    // 初期化
    tags.forEach(tag => {
      tagStats.set(tag.id, { tag, total: 0, completed: 0 });
    });

    // 今週のタスクについてタグ別に集計
    weeklyTasks.forEach(task => {
      const taskTagList = taskTags.get(task.id) || [];
      
      taskTagList.forEach(tag => {
        const stats = tagStats.get(tag.id);
        if (stats) {
          stats.total++;
          if (task.status === 'completed') {
            stats.completed++;
          }
        }
      });
    });

    // タスクが割り当てられているタグのみを返す
    return Array.from(tagStats.values()).filter(stats => stats.total > 0);
  };

  const tagStatsArray = calculateTagStats();

  if (tagStatsArray.length === 0) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          今週のタグ付きタスクがありません
        </div>
      </div>
    );
  }

  // チャートの設定 - スタックドバー用（コンパクトサイズ、windowSizeを使用）
  const getChartDimensions = () => {
    if (windowSize.width <= 480) {
      return { width: Math.min(280, windowSize.width - 40), height: 80, barHeight: 20, padding: { top: 25, right: 10, bottom: 25, left: 10 } };
    } else if (windowSize.width <= 768) {
      return { width: Math.min(400, windowSize.width - 60), height: 80, barHeight: 20, padding: { top: 25, right: 15, bottom: 25, left: 15 } };
    } else if (windowSize.width <= 1024) {
      return { width: 550, height: 90, barHeight: 25, padding: { top: 28, right: 20, bottom: 28, left: 20 } };
    }
    return { width: 600, height: 100, barHeight: 30, padding: { top: 30, right: 20, bottom: 30, left: 20 } };
  };

  const { width, height, barHeight, padding } = getChartDimensions();

  // 全体のタスク数を計算
  const totalTasks = tagStatsArray.reduce((sum, stats) => sum + stats.total, 0);
  const maxBarWidth = width - padding.left - padding.right;
  
  // 各タグのセグメントを計算
  let currentX = padding.left;
  const segments = tagStatsArray.map(stats => {
    const segmentWidth = (stats.total / totalTasks) * maxBarWidth;
    const segment = {
      x: currentX,
      width: segmentWidth,
      tag: stats.tag,
      total: stats.total,
      completed: stats.completed,
      percentage: Math.round((stats.completed / stats.total) * 100)
    };
    currentX += segmentWidth;
    return segment;
  });

  const y = padding.top;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width} height={height}>
        {/* 背景 */}
        <rect width={width} height={height} fill="white" />
        
        {/* ラベル */}
        <text
          x={padding.left}
          y={y - 10}
          textAnchor="start"
          alignmentBaseline="baseline"
          fontSize="12"
          fill="#6b7280"
          fontWeight="500"
        >
          タグ別タスク分布
        </text>
        
        {/* 背景バー（灰色ベース） */}
        <rect
          x={padding.left}
          y={y}
          width={maxBarWidth}
          height={barHeight}
          fill="#f3f4f6"
          rx={4}
        />
        
        {/* スタックドセグメント */}
        {segments.map((segment, index) => (
          <g key={segment.tag.id}>
            {/* 完了部分（タグの色） */}
            <rect
              x={segment.x}
              y={y}
              width={segment.width * (segment.completed / segment.total)}
              height={barHeight}
              fill={segment.tag.color}
              stroke="white"
              strokeWidth="1"
              rx={index === 0 ? 4 : 0}
            />
            
            {/* セグメント内のテキスト（幅が十分な場合のみ） */}
            {segment.width > 50 && (
              <text
                x={segment.x + segment.width / 2}
                y={y + barHeight / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="11"
                fill="#374151"
                fontWeight="600"
                style={{ pointerEvents: 'none' }}
              >
                {segment.percentage}%
              </text>
            )}
          </g>
        ))}
        
        {/* 凡例 */}
        <g transform={`translate(${padding.left}, ${y + barHeight + 12})`}>
          {segments.map((segment, index) => {
            const legendX = (index % 4) * 140;
            const legendY = Math.floor(index / 4) * 16;
            
            return (
              <g key={segment.tag.id} transform={`translate(${legendX}, ${legendY})`}>
                <rect
                  x={0}
                  y={0}
                  width={10}
                  height={10}
                  fill={segment.tag.color}
                  rx={2}
                />
                <text
                  x={14}
                  y={8}
                  fontSize="10"
                  fill="#374151"
                >
                  {segment.tag.name} ({segment.completed}/{segment.total})
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default TagProgressChart;