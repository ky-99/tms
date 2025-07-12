import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import TaskCard from '../components/TaskCard';
import CalendarView from '../components/CalendarView';
import TaskTreeOverview from '../components/TaskTreeOverview';
import TaskDetailModal from '../components/TaskDetailModal';
import { useTaskContext } from '../contexts/TaskContext';
import { useShortcut } from '../contexts/ShortcutContext';
import { Task } from '../types';


const HomePage: React.FC = () => {
  const { tasks, loading, error, loadTasks } = useTaskContext();
  const { setCurrentContext } = useShortcut();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [stableSelectedTask, setStableSelectedTask] = useState<Task | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  
  // 初回読み込み完了を追跡するためのRef
  const initialLoadCompleted = useRef(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setStableSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setIsCreatingTask(false);
    // モーダルが完全に閉じるまで少し待ってからstableSelectedTaskをクリア
    setTimeout(() => {
      setStableSelectedTask(null);
    }, 300);
  };

  const openCreateModal = () => {
    setSelectedTask(null);
    setStableSelectedTask(null);
    setIsCreatingTask(true);
    setIsTaskModalOpen(true);
  };

  // ダッシュボードのコンテキストを設定
  useEffect(() => {
    setCurrentContext('dashboard');
    
    // クリーンアップ時にグローバルに戻す
    return () => {
      setCurrentContext('global');
    };
  }, [setCurrentContext]);

  // タスクが読み込まれた際に初回読み込み完了フラグを設定
  useEffect(() => {
    if (tasks.length > 0 && !initialLoadCompleted.current) {
      initialLoadCompleted.current = true;
    }
  }, [tasks]);

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
  }, []); // loadTasks依存を削除して無限ループを防ぐ

  // ステータス変更の検出とモーダル保護
  useEffect(() => {
    if (isStatusChanging) {
      // ステータス変更中は一定時間後にフラグをリセット
      const timer = setTimeout(() => {
        setIsStatusChanging(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isStatusChanging]);

  // モーダルが開いているときは、選択されたタスクの最新情報を保持
  // stableSelectedTaskを基準にして、モーダルの安定性を保証
  const currentSelectedTask = useMemo(() => {
    if (!stableSelectedTask || !isTaskModalOpen) return null;
    
    // contextTasksから最新のタスクデータを検索
    const findTask = (tasks: Task[], targetId: number): Task | null => {
      for (const task of tasks) {
        if (task.id === targetId) {
          return task;
        }
        if (task.children) {
          const found = findTask(task.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const foundTask = findTask(tasks, stableSelectedTask.id);
    
    // ステータス変更中は、タスクが見つからなくてもstableSelectedTaskを返す
    // これにより、ステータス変更中の一瞬の空白期間でもモーダルが落ちない
    if (isStatusChanging && !foundTask) {
      return stableSelectedTask;
    }
    
    // 最新のタスクが見つからない場合でも、stableSelectedTaskを返してモーダルを維持
    return foundTask || stableSelectedTask;
  }, [stableSelectedTask, isTaskModalOpen, tasks, isStatusChanging]);

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

  // 初回読み込み中のみローディング画面を表示
  if (loading && !initialLoadCompleted.current) {
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
          </div>
        ) : (
          <>
            {overdueTasks.length > 0 && (
              <div className="dashboard-section">
                <h2 className="section-title overdue">期限切れ ({overdueTasks.length})</h2>
                <div className="task-cards">
                  {overdueTasks.map(task => (
                    <TaskCard key={task.id} task={task} onTaskClick={() => handleTaskClick(task)} disableSelection={true} />
                  ))}
                </div>
              </div>
            )}

            <div className="dashboard-section">
              <h2 className="section-title">今日のタスク ({todayTasks.length})</h2>
              <div className="task-cards">
                {todayTasks.length > 0 ? (
                  todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} onTaskClick={() => handleTaskClick(task)} disableSelection={true} />
                  ))
                ) : (
                  <p className="no-tasks">今日のタスクはありません</p>
                )}
              </div>
            </div>

            <div className="dashboard-section calendar-section">
              <CalendarView tasks={flatTasks} onTaskClick={handleTaskClick} />
            </div>

            {/* タスクツリー概要 - 今後の開発用に一時的に非表示
            <div className="dashboard-section tree-overview-section">
              <TaskTreeOverview tasks={tasks} onTaskClick={handleTaskClick} />
            </div>
            */}
          </>
        )}
      </div>

      {/* タスク詳細モーダル */}
      {(stableSelectedTask || isCreatingTask) && (
        <TaskDetailModal
          task={currentSelectedTask || stableSelectedTask || undefined}
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          allTasks={tasks}
          isCreating={isCreatingTask}
          onStatusChange={() => setIsStatusChanging(true)}
        />
      )}
    </div>
  );
};

export default HomePage;