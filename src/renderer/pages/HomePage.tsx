import React, { useState, useEffect, useMemo } from 'react';
import TaskCard from '../components/TaskCard';
import CalendarView from '../components/CalendarView';
import TaskDetailModal from '../components/TaskDetailModal';
import { useTaskContext } from '../contexts/TaskContext';
import { Task } from '../types';


const HomePage: React.FC = () => {
  const { tasks, loading, error, loadTasks } = useTaskContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  useEffect(() => {
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
  }, [loadTasks]);

  // メモ化された日付計算
  const todayTimestamp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
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
  const { todayTasks, overdueTasks } = useMemo(() => {
    const today = todayTimestamp;

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

    return {
      todayTasks: todayFiltered,
      overdueTasks: overdueFiltered
    };
  }, [flatTasks, todayTimestamp]);

  if (loading) {
    return <div className="loading">ダッシュボードを読み込んでいます...</div>;
  }



  if (loading) {
    return <div className="loading">ダッシュボードを読み込んでいます...</div>;
  }

  return (
    <div className="dashboard">
      {error && (
        <div className="error">{error}</div>
      )}

      <div className="dashboard-content">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <h2>タスクが登録されていません</h2>
            <p>新しいタスクを作成してスタートしましょう</p>
          </div>
        ) : (
          <>
            {overdueTasks.length > 0 && (
              <div className="dashboard-section">
                <h2 className="section-title overdue">期限切れ ({overdueTasks.length})</h2>
                <div className="task-cards">
                  {overdueTasks.map(task => (
                    <TaskCard key={task.id} task={task} onTaskClick={() => handleTaskClick(task)} />
                  ))}
                </div>
              </div>
            )}

            <div className="dashboard-section">
              <h2 className="section-title">今日のタスク ({todayTasks.length})</h2>
              <div className="task-cards">
                {todayTasks.length > 0 ? (
                  todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} onTaskClick={() => handleTaskClick(task)} />
                  ))
                ) : (
                  <p className="no-tasks">今日のタスクはありません</p>
                )}
              </div>
            </div>

            <div className="dashboard-section calendar-section">
              <CalendarView tasks={flatTasks} onTaskClick={handleTaskClick} />
            </div>
          </>
        )}
      </div>

      {/* タスク詳細モーダル */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          allTasks={tasks}
        />
      )}
    </div>
  );
};

export default HomePage;