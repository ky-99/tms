import { useMemo } from 'react';
import { Task } from '../types';

export interface DateManagerHook {
  todayTimestamp: number;
  flatTasks: Task[];
  todayTasks: Task[];
  overdueTasks: Task[];
}

export const useDateManager = (tasks: Task[]): DateManagerHook => {
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
      if (task.isRoutine) {
        return true;
      }
      
      const endDateValue = task.endDate;
      if (!endDateValue) return false;
      const endDate = new Date(endDateValue);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === today;
    });

    // 期限切れタスク
    const overdueFiltered = flatTasks.filter(task => {
      // ルーティンタスクは期限切れとして表示しない
      if (task.isRoutine || task.isRoutine) return false;
      
      const endDateValue = task.endDate;
      if (!endDateValue || task.status === 'completed') return false;
      const endDate = new Date(endDateValue);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() < today;
    });

    return {
      todayTasks: todayFiltered,
      overdueTasks: overdueFiltered
    };
  }, [flatTasks, todayTimestamp]);

  return {
    todayTimestamp,
    flatTasks,
    todayTasks,
    overdueTasks
  };
};