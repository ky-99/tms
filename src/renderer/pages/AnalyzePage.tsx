import React, { useState, useEffect } from 'react';
import CompletedTasksChart from '../components/CompletedTasksChart';
import PriorityProgressChart from '../components/PriorityProgressChart';
import TaskStatusPieChart from '../components/TaskStatusPieChart';
import TagProgressChart from '../components/TagProgressChart';
import WeeklyTaskCards from '../components/WeeklyTaskCards';
import TaskDetailModal from '../components/TaskDetailModal';
import { TaskWithChildren } from '../types';

const AnalyzePage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithChildren[]>([]);
  const [chartData, setChartData] = useState<{ date: string; completed: number; planned: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithChildren | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const handleTaskClick = (task: TaskWithChildren) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await window.taskAPI.getAllTasks();
      setTasks(allTasks);
      
      // 完了タスクのデータを集計
      const completedTasks = collectCompletedTasks(allTasks);
      const aggregatedData = aggregateTasksByDate(completedTasks, allTasks);
      setChartData(aggregatedData);
    } catch (error) {
      console.error('タスクの読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  // 今週の期日タスクの中で完了しているもののみを収集
  const collectCompletedTasks = (taskList: TaskWithChildren[]): TaskWithChildren[] => {
    const completed: TaskWithChildren[] = [];
    
    // 今週の開始（月曜日）と終了（日曜日）を計算
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const collectRecursive = (tasks: TaskWithChildren[]) => {
      tasks.forEach(task => {
        // タスクが完了していることをチェック
        if (task.status === 'completed') {
          // 期日が今週の範囲内かチェック
          const dueDateValue = task.dueDate || task.due_date;
          if (dueDateValue) {
            const dueDate = new Date(dueDateValue);
            dueDate.setHours(0, 0, 0, 0);
            
            // 期日が今週の範囲内の場合のみ追加
            if (dueDate >= monday && dueDate <= sunday) {
              completed.push(task);
            }
          }
        }
        if (task.children) {
          collectRecursive(task.children);
        }
      });
    };
    
    collectRecursive(taskList);
    return completed;
  };

  // 全階層のタスク数をカウント
  const countAllTasks = (taskList: TaskWithChildren[]): number => {
    let count = 0;
    
    const countRecursive = (tasks: TaskWithChildren[]) => {
      tasks.forEach(task => {
        count++;
        if (task.children) {
          countRecursive(task.children);
        }
      });
    };
    
    countRecursive(taskList);
    return count;
  };

  // 今週月曜日から日曜日までの日付ごとに集計（バーンアップチャート用）
  const aggregateTasksByDate = (completedTasks: TaskWithChildren[], allTasksFromRoot: TaskWithChildren[]): { date: string; completed: number; planned: number }[] => {
    const completedMap = new Map<string, number>();
    
    // 今週の日曜日から土曜日までのデータを作成（日曜日週始まり）
    const today = new Date();
    const sunday = new Date(today);
    // 今週の日曜日を取得（週始まり）
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      dates.push(date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      completedMap.set(dateStr, 0);
    }
    
    // 今週の開始時点（日曜日）を計算
    const weekStart = new Date(sunday);
    
    // ダッシュボードと同じロジックで全タスクを平坦化
    const flattenTasks = (taskList: TaskWithChildren[]): TaskWithChildren[] => {
      const result: TaskWithChildren[] = [];
      
      const addTask = (task: TaskWithChildren) => {
        result.push(task);
        if (task.children) {
          task.children.forEach(addTask);
        }
      };
      
      taskList.forEach(addTask);
      return result;
    };
    
    // 期日タスクの処理用に全タスクを平坦化
    const allTasks = flattenTasks(allTasksFromRoot);
    
    // デバッグ用ログ
    console.log('全タスク数:', allTasks.length);
    const tasksWithDueDate = allTasks.filter(task => task.dueDate || task.due_date);
    console.log('期日付きタスク数:', tasksWithDueDate.length);
    console.log('期日付きタスク一覧:', tasksWithDueDate.map(task => ({
      title: task.title,
      dueDate: task.dueDate || task.due_date
    })));
    
    // 今週期日のタスクのうち完了済みタスクをカウント
    // （完了日は関係なく、その日時点で完了しているかどうかで判定）
    const weeklyDueTasks = allTasks.filter(task => {
      const dueDateValue = task.dueDate || task.due_date;
      if (!dueDateValue) return false;
      
      const dueDate = new Date(dueDateValue);
      dueDate.setHours(0, 0, 0, 0);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);
      
      return dueDate >= sunday && dueDate <= saturday;
    });
    
    // 各日付において、その時点で完了済みの今週期日タスクをカウント
    dates.forEach(date => {
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      let completedCount = 0;
      
      weeklyDueTasks.forEach(task => {
        if (task.status === 'completed') {
          const completedAt = task.completedAt || task.completed_at;
          if (completedAt) {
            // UTC時刻として解釈されているデータをローカル時刻として扱う
            let completedDate: Date;
            
            // SQLiteのdatetime文字列をローカル時刻として確実に解釈
            if (typeof completedAt === 'string') {
              // SQLiteのdatetime形式: "YYYY-MM-DD HH:MM:SS"
              const dateTimeMatch = completedAt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
              if (dateTimeMatch) {
                const [, year, month, day, hour, minute, second] = dateTimeMatch;
                // ローカル時刻として明示的に作成
                completedDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1, // 月は0ベース
                  parseInt(day),
                  parseInt(hour),
                  parseInt(minute),
                  parseInt(second)
                );
              } else {
                completedDate = new Date(completedAt);
              }
            } else {
              completedDate = new Date(completedAt);
            }
            
            // その日の日付のみで比較（時刻は無視）
            const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
            const targetDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            // その日またはそれ以前に完了していればカウント
            if (completedDateOnly <= targetDateOnly) {
              completedCount++;
            }
          }
        }
      });
      
      completedMap.set(dateStr, completedCount);
    });
    
    // バーンアップチャート用データを作成
    const result: { date: string; completed: number; planned: number }[] = [];
    
    dates.forEach(date => {
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      
      // その日時点での完了数（既に累積計算済み）
      const completedCount = completedMap.get(dateStr) || 0;
      
      // 今週分の期日タスクの累積数を計算
      const cumulativePlanned = allTasks.filter(task => {
        const dueDateValue = task.dueDate || task.due_date;
        if (!dueDateValue) return false;
        
        const dueDate = new Date(dueDateValue);
        dueDate.setHours(0, 0, 0, 0);
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        // 今週の範囲内で、その日までに期日が来るタスクを累積カウント
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);
        
        return dueDate >= sunday && dueDate <= targetDate;
      }).length;
      
      result.push({ 
        date: dateStr, 
        completed: completedCount,
        planned: cumulativePlanned
      });
    });
    
    return result;
  };

  if (loading) {
    return (
      <div className="analyze-page">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="analytics-grid">
      <div className="main-charts-container">
        <div className="grid-item burnup-chart-only">
          <div className="chart-header">
            <h2>タスクバーンアップ</h2>
          </div>
          <div className="chart-content">
            <CompletedTasksChart data={chartData} />
          </div>
        </div>
        
        <div className="grid-item tag-progress-chart">
          <div className="chart-header">
            <h2>タグ別進行数</h2>
          </div>
          <div className="chart-content">
            <TagProgressChart tasks={tasks} />
          </div>
        </div>
      </div>
      
      <div className="side-charts-container">
        <div className="grid-item priority-progress-chart">
          <div className="chart-header">
            <h2>重要度別進行度</h2>
          </div>
          <div className="chart-content">
            <PriorityProgressChart tasks={tasks} />
          </div>
        </div>
        
        <div className="grid-item task-status-chart">
          <div className="chart-header">
            <h2>タスク別進行数</h2>
          </div>
          <div className="chart-content">
            <TaskStatusPieChart tasks={tasks} />
          </div>
        </div>
      </div>
      
      <div className="task-cards-container">
        <div className="grid-item weekly-tasks-section">
          <div className="chart-header">
            <h2>今週のタスク状況</h2>
          </div>
          <div className="chart-content">
            <WeeklyTaskCards tasks={tasks} onTaskClick={handleTaskClick} />
          </div>
        </div>
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

export default AnalyzePage;