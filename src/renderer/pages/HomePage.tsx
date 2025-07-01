import React, { useState, useEffect, useMemo } from 'react';
import TaskCard from '../components/TaskCard';
import CircularProgress from '../components/CircularProgress';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  due_date?: string;
  created_at?: string;
  createdAt?: string;
  completedAt?: string;
  completed_at?: string;
  children?: Task[];
  expanded?: boolean;
  isRoutine?: boolean;
  is_routine?: boolean;
}

const HomePage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await window.taskAPI.getAllTasks();
      setTasks(allTasks);
      setError(null);
    } catch (err) {
      setError('タスクの読み込みに失敗しました: ' + err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    
    // 日付変更を検知して自動更新
    const checkDateChange = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      // 深夜0時に更新
      const midnightTimer = setTimeout(() => {
        loadTasks();
        // 次の日の0時もチェックするため再帰的に設定
        checkDateChange();
      }, msUntilMidnight);
      
      return () => clearTimeout(midnightTimer);
    };
    
    const cleanup = checkDateChange();
    
    // 1分ごとにもチェック（ブラウザがスリープから復帰した場合の対策）
    const intervalId = setInterval(() => {
      const currentDate = new Date().toDateString();
      const lastCheckDate = localStorage.getItem('lastCheckDate');
      
      if (currentDate !== lastCheckDate) {
        localStorage.setItem('lastCheckDate', currentDate);
        loadTasks();
      }
    }, 60000); // 1分ごと
    
    // 初回の日付を保存
    localStorage.setItem('lastCheckDate', new Date().toDateString());
    
    return () => {
      cleanup();
      clearInterval(intervalId);
    };
  }, []);

  // メモ化された日付計算
  const todayTimestamp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  const weekRange = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, []);

  // メモ化された平坦化タスクリスト
  const flatTasks = useMemo(() => {
    const result: Task[] = [];
    
    const addTask = (task: Task) => {
      result.push(task);
      if (task.children) {
        task.children.forEach(addTask);
      }
    };
    
    tasks.forEach(addTask);
    return result;
  }, [tasks]);

  // メモ化されたタスクフィルタリング
  const { todayTasks, overdueTasks, weeklyData } = useMemo(() => {
    const today = todayTimestamp;
    const { monday, sunday } = weekRange;

    // 今日のタスク
    const todayFiltered = flatTasks.filter(task => {
      // ルーティンタスクは常に今日のタスクとして表示
      if (task.isRoutine || task.is_routine) {
        return true;
      }
      
      const dueDateValue = task.dueDate || task.due_date;
      if (!dueDateValue) return false;
      const dueDate = new Date(dueDateValue);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today;
    });

    // 期限切れタスク
    const overdueFiltered = flatTasks.filter(task => {
      // ルーティンタスクは期限切れとして表示しない
      if (task.isRoutine || task.is_routine) return false;
      
      const dueDateValue = task.dueDate || task.due_date;
      if (!dueDateValue || task.status === 'completed') return false;
      const dueDate = new Date(dueDateValue);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() < today;
    });

    // 今週のタスク進捗
    const weekTasks = flatTasks.filter(task => {
      const dueDateValue = task.dueDate || task.due_date;
      if (!dueDateValue) return false;
      const dueDate = new Date(dueDateValue);
      return dueDate >= monday && dueDate <= sunday;
    });

    const completedWeekTasks = weekTasks.filter(task => task.status === 'completed');

    return {
      todayTasks: todayFiltered,
      overdueTasks: overdueFiltered,
      weeklyData: {
        total: weekTasks.length,
        completed: completedWeekTasks.length
      }
    };
  }, [flatTasks, todayTimestamp, weekRange]);

  // 今日のタスク進捗データ（メモ化）
  const todayCompletedTasks = useMemo(() => 
    todayTasks.filter(task => task.status === 'completed'), 
    [todayTasks]
  );

  if (loading) {
    return <div className="loading">ダッシュボードを読み込んでいます...</div>;
  }

  return (
    <div className="dashboard">

      {error && (
        <div className="error">{error}</div>
      )}

      <div className="dashboard-content">
        {overdueTasks.length > 0 && (
          <div className="dashboard-section">
            <h2 className="section-title overdue">期限切れ ({overdueTasks.length})</h2>
            <div className="task-cards">
              {overdueTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        <div className="dashboard-section">
          <h2 className="section-title">今日のタスク ({todayTasks.length})</h2>
          <div className="task-cards">
            {todayTasks.length > 0 ? (
              todayTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <p className="no-tasks">今日のタスクはありません</p>
            )}
          </div>
        </div>

        {/* 進捗グラフ */}
        <div className="dashboard-section progress-section">
          <div className="progress-charts">
            <CircularProgress 
              title="今日の進捗"
              completed={todayCompletedTasks.length}
              total={todayTasks.length}
            />
            <CircularProgress 
              title="今週の進捗"
              completed={weeklyData.completed}
              total={weeklyData.total}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;