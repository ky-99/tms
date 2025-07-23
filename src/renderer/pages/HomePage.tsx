import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CalendarTaskCreateModal from '../components/modals/CalendarTaskCreateModal';
import CalendarTaskEditModal from '../components/modals/CalendarTaskEditModal';
import TodayTasksSection from '../components/dashboard/TodayTasksSection';
import OverdueTasksSection from '../components/dashboard/OverdueTasksSection';
import { useTaskContext } from '../contexts/TaskContext';
import { useShortcut } from '../contexts/ShortcutContext';
import { useScrollManager, useDateManager } from '../hooks';
import { Task } from '../types';


const HomePage: React.FC = () => {
  const { tasks, loading, initialized, error, loadTasks, updateTask } = useTaskContext();
  const { setCurrentContext } = useShortcut();
  const { 
    mainContentRef, 
    saveScrollPosition, 
    restoreScrollPosition 
  } = useScrollManager();
  const { todayTasks, overdueTasks } = useDateManager(tasks);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [stableSelectedTask, setStableSelectedTask] = useState<Task | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setStableSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const [createTaskDate, setCreateTaskDate] = useState<string | undefined>(undefined);
  const [showTodayTasks, setShowTodayTasks] = useState(() => {
    const saved = localStorage.getItem('showTodayTasks');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showOverdueTasks, setShowOverdueTasks] = useState(() => {
    const saved = localStorage.getItem('showOverdueTasks');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setIsCreatingTask(false);
    setCreateTaskDate(undefined);
    // モーダルが完全に閉じるまで少し待ってからstableSelectedTaskをクリア
    setTimeout(() => {
      setStableSelectedTask(null);
    }, 300);
  }, []);

  const openCreateModal = useCallback(() => {
    // タスク作成前にスクロール位置を保存
    saveScrollPosition();
    
    setSelectedTask(null);
    setStableSelectedTask(null);
    setIsCreatingTask(true);
    setIsTaskModalOpen(true);
    // createTaskDateはリセットしない - カレンダーから渡された日付を保持
  }, [saveScrollPosition]);

  // トグル状態の変更関数
  const toggleTodayTasks = useCallback(() => {
    const newState = !showTodayTasks;
    setShowTodayTasks(newState);
    localStorage.setItem('showTodayTasks', JSON.stringify(newState));
  }, [showTodayTasks]);

  const toggleOverdueTasks = useCallback(() => {
    const newState = !showOverdueTasks;
    setShowOverdueTasks(newState);
    localStorage.setItem('showOverdueTasks', JSON.stringify(newState));
  }, [showOverdueTasks]);

  // ダッシュボードのコンテキストを設定（CalendarViewのコンテキストを尊重）
  useEffect(() => {
    // 初期化時のみダッシュボードコンテキストを設定
    setCurrentContext('dashboard');
    
    // クリーンアップ時にグローバルに戻す
    return () => {
      setCurrentContext('global');
    };
  }, []); // setCurrentContextの依存関係を削除してコンテキスト競合を防ぐ

  // ショートカットイベントリスナー
  useEffect(() => {
    const handleShortcutEvents = (event: CustomEvent) => {
      switch (event.type) {
        case 'openTaskEditModal':
          if (event.detail?.task) {
            handleTaskClick(event.detail.task);
          }
          break;
        case 'openTaskCreateModal':
          // parentId パラメータは無視（ホームページではルートレベルのタスクを作成）
          openCreateModal();
          break;
        case 'createTaskWithDate':
          // カレンダーから日付付きタスクを作成
          if (event.detail?.date) {
            setCreateTaskDate(event.detail.date);
            openCreateModal();
          }
          break;
      }
    };

    // イベントリスナーを追加
    window.addEventListener('openTaskEditModal', handleShortcutEvents as EventListener);
    window.addEventListener('openTaskCreateModal', handleShortcutEvents as EventListener);
    window.addEventListener('createTaskWithDate', handleShortcutEvents as EventListener);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('openTaskEditModal', handleShortcutEvents as EventListener);
      window.removeEventListener('openTaskCreateModal', handleShortcutEvents as EventListener);
      window.removeEventListener('createTaskWithDate', handleShortcutEvents as EventListener);
    };
  }, [handleTaskClick, openCreateModal]);


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


  // タスク更新前にスクロール位置を保存
  useEffect(() => {
    const handleBeforeUpdate = () => {
      saveScrollPosition();
    };

    // カスタムイベントを監視
    window.addEventListener('taskUpdateStart', handleBeforeUpdate);
    return () => window.removeEventListener('taskUpdateStart', handleBeforeUpdate);
  }, [saveScrollPosition]);

  // タスク更新後にスクロール位置を復元
  useEffect(() => {
    restoreScrollPosition();
  }, [tasks, restoreScrollPosition]);

  return (
    <div className="dashboard">
      {error && (
        <div className="error">{error}</div>
      )}

      <div ref={mainContentRef} className="dashboard-content">
        {!initialized ? (
          <div className="loading-placeholder">
            {/* 初期化中は何も表示しない */}
          </div>
        ) : tasks.length === 0 ? (
          <div className="dashboard__empty-state">
            <h2 className="dashboard__empty-state-title">タスクが登録されていません</h2>
          </div>
        ) : (
          <>
            <OverdueTasksSection
              tasks={overdueTasks}
              isExpanded={showOverdueTasks}
              onToggle={toggleOverdueTasks}
              onTaskClick={handleTaskClick}
            />

            <TodayTasksSection
              tasks={todayTasks}
              isExpanded={showTodayTasks}
              onToggle={toggleTodayTasks}
              onTaskClick={handleTaskClick}
            />

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
        isCreatingTask ? (
          <CalendarTaskCreateModal
            isOpen={isTaskModalOpen}
            onClose={handleCloseTaskModal}
            defaultValues={{
              endDate: createTaskDate
            }}
          />
        ) : (
          <CalendarTaskEditModal
            isOpen={isTaskModalOpen}
            onClose={handleCloseTaskModal}
            task={currentSelectedTask || stableSelectedTask || undefined}
            onStatusChange={() => setIsStatusChanging(true)}
          />
        )
      )}
    </div>
  );
};

export default HomePage;