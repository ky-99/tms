import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { useTaskData } from '../contexts/TaskDataContext';
import { useTaskContext } from '../contexts/TaskContext';
import TimelineView from '../components/dashboard/TimelineView';
import CalendarView from '../components/calendar/CalendarView';
import TaskDetailModal from '../components/modals/TaskDetailModal';
import { setEndOfDay } from '../utils/lightDateUtils';
import '../styles/views-page.css';

type ViewType = 'timeline' | 'calendar';

const ViewsPage: React.FC = () => {
  const { tasks } = useTaskData();
  const { updateTask } = useTaskContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [defaultEndDate, setDefaultEndDate] = useState<string | undefined>();
  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
    setIsCreating(false);
  };

  const handleCreateTask = (date: string) => {
    // カレンダーから作成する場合は終了日を23:59に設定
    if (date) {
      const endOfDay = setEndOfDay(date);
      setDefaultEndDate(endOfDay.toISOString());
    } else {
      setDefaultEndDate(date);
    }
    setSelectedTask(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    return await updateTask(taskId, updates);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setIsCreating(false);
    setDefaultEndDate(undefined);
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (currentView === 'timeline') {
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
            {currentView === 'timeline' 
              ? `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月` 
              : `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
            }
          </div>
        </div>
        
        <div className="view-type-buttons">
          <button 
            className={`view-type-button ${currentView === 'timeline' ? 'active' : ''}`}
            onClick={() => setCurrentView('timeline')}
          >
            週
          </button>
          <button 
            className={`view-type-button ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => setCurrentView('calendar')}
          >
            月
          </button>
        </div>
      </div>

      <div className="views-content">
        {currentView === 'timeline' ? (
          <TimelineView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            currentDate={currentDate}
          />
        ) : (
          <CalendarView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onCreateTask={handleCreateTask}
            currentDate={currentDate}
            hideNavigation={true}
          />
        )}
      </div>

      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask || undefined}
        isCreating={isCreating}
        defaultEndDate={defaultEndDate}
      />
    </div>
  );
};

export default ViewsPage;