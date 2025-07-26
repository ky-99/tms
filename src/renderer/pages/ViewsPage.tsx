import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '../types';
import { useTaskData } from '../contexts/TaskDataContext';
import { useTaskContext } from '../contexts/TaskContext';
import { useShortcut } from '../contexts/ShortcutContext';
import CalendarView from '../components/calendar/CalendarView';
import TimelineView from '../components/calendar/TimelineView';
import CalendarTaskCreateModal from '../components/modals/CalendarTaskCreateModal';
import CalendarTaskEditModal from '../components/modals/CalendarTaskEditModal';
import { setEndOfDay } from '../utils/lightDateUtils';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import '../styles/views-page.css';

type ViewType = 'calendar';
type CalendarViewType = 'month' | 'week';

const ViewsPage: React.FC = () => {
  const { tasks } = useTaskData();
  const { updateTask } = useTaskContext();
  const { setCurrentContext } = useShortcut();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [stableSelectedTask, setStableSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [defaultEndDate, setDefaultEndDate] = useState<string | undefined>();
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarViewType, setCalendarViewType] = useState<CalendarViewType>('month');

  // TasksPageと同様のタスク検索関数
  const findTaskById = useCallback((taskList: Task[], targetId: number): Task | null => {
    for (const task of taskList) {
      if (task.id === targetId) {
        return task;
      }
      if (task.children && task.children.length > 0) {
        const found = findTaskById(task.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // 現在選択されているタスクの最新情報を取得（TasksPageと同様のロジック）
  const currentSelectedTask = useMemo(() => {
    if (!stableSelectedTask || !isModalOpen) return null;
    
    const foundTask = findTaskById(tasks, stableSelectedTask.id);
    
    // タスクが見つからない場合でも、stableSelectedTaskを返してモーダルを維持
    return foundTask || stableSelectedTask;
  }, [stableSelectedTask, isModalOpen, tasks, findTaskById]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setStableSelectedTask(task); // 安定したタスク参照を保存
    setIsModalOpen(true);
    setIsCreating(false);
  };

  const handleCreateTask = (date: string, time?: string) => {
    // カレンダーから作成する場合は開始日と終了日に日付のみを設定（時刻は未入力状態）
    if (date) {
      // 日付のみをそのまま設定（時刻は補完しない）
      setDefaultStartDate(date);
      setDefaultEndDate(date);
    } else {
      setDefaultStartDate(undefined);
      setDefaultEndDate(undefined);
    }
    setSelectedTask(null);
    setStableSelectedTask(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  // CalendarView用のonUpdateTask（Promise<void>を返す）
  const handleUpdateTaskForCalendar = async (taskId: number, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
    } catch (error) {
      console.error('ViewsPage: Failed to update task', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setIsCreating(false);
    setDefaultEndDate(undefined);
    // モーダルが完全に閉じるまで少し待ってからstableSelectedTaskをクリア
    setTimeout(() => {
      setStableSelectedTask(null);
    }, 300);
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (calendarViewType === 'week') {
      // 週ナビゲーション
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    } else {
      // 月ナビゲーション
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // ショートカットイベントリスナー
  useEffect(() => {
    const handleShortcutEvents = (event: CustomEvent) => {
      switch (event.type) {
        case 'openTaskCreateModal':
          // ViewsPageではcmd+nを押した場合は今日の日付でタスクを作成
          const todayString = new Date().toISOString().split('T')[0];
          handleCreateTask(todayString);
          break;
        case 'createTaskWithDate':
          // カレンダーから日付付きタスクを作成
          if (event.detail?.date) {
            handleCreateTask(event.detail.date);
          }
          break;
      }
    };

    // イベントリスナーを追加
    window.addEventListener('openTaskCreateModal', handleShortcutEvents as EventListener);
    window.addEventListener('createTaskWithDate', handleShortcutEvents as EventListener);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('openTaskCreateModal', handleShortcutEvents as EventListener);
      window.removeEventListener('createTaskWithDate', handleShortcutEvents as EventListener);
    };
  }, [handleCreateTask]);

  // ViewsPageのコンテキストを設定
  useEffect(() => {
    // カレンダー表示時はcalendarコンテキストを設定
    setCurrentContext('calendar');
    
    return () => {
      setCurrentContext('global');
    };
  }, [setCurrentContext]);

  return (
    <div className="views-page">
      <div className="views-page-header">
        <div className="date-navigation">
          <button 
            className="today-button" 
            onClick={handleToday}
          >
            今日
          </button>
          <button 
            className="nav-button" 
            onClick={() => handleDateNavigation('prev')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/>
            </svg>
          </button>
          <button 
            className="nav-button" 
            onClick={() => handleDateNavigation('next')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
            </svg>
          </button>
          <div className="date-display">
            {calendarViewType === 'week' ? (
              (() => {
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
                const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
                return `${format(weekStart, 'M/d', { locale: ja })} - ${format(weekEnd, 'M/d', { locale: ja })}`;
              })()
            ) : (
              `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
            )}
          </div>
        </div>
        
        <div className="view-type-selector">
          <button 
            className={`view-type-button ${calendarViewType === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarViewType('month')}
          >
            月
          </button>
          <button 
            className={`view-type-button ${calendarViewType === 'week' ? 'active' : ''}`}
            onClick={() => setCalendarViewType('week')}
          >
            週
          </button>
        </div>
      </div>

      <div className="views-content">
        {calendarViewType === 'week' ? (
          <TimelineView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onCreateTask={handleCreateTask}
            currentDate={currentDate}
            onUpdateTask={updateTask}
          />
        ) : (
          <CalendarView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onCreateTask={handleCreateTask}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            viewType={calendarViewType}
          />
        )}
      </div>

      {isCreating ? (
        <CalendarTaskCreateModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          defaultValues={{
            startDate: defaultStartDate,
            endDate: defaultEndDate
          }}
        />
      ) : (
        <CalendarTaskEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={currentSelectedTask || stableSelectedTask || undefined}
        />
      )}
    </div>
  );
};

export default ViewsPage;