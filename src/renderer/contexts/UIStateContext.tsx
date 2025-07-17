import React, { createContext, useContext, ReactNode } from 'react';
import { Task } from '../types/task';

interface UIStateContextValue {
  hoveredTask: Task | null;
  hoveredCalendarTaskId: number | null;
  hoveredCalendarDate: string | null;
  setHoveredTask: (task: Task | null) => void;
  setHoveredCalendarTaskId: (taskId: number | null) => void;
  setHoveredCalendarDate: (date: string | null) => void;
  clearSelection: () => void;
}

const UIStateContext = createContext<UIStateContextValue | undefined>(undefined);

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};

interface UIStateProviderProps {
  children: ReactNode;
}

export const UIStateProvider: React.FC<UIStateProviderProps> = ({ children }) => {
  const [hoveredTask, setHoveredTask] = React.useState<Task | null>(null);
  const [hoveredCalendarTaskId, setHoveredCalendarTaskId] = React.useState<number | null>(null);
  const [hoveredCalendarDate, setHoveredCalendarDate] = React.useState<string | null>(null);

  // 選択状態をクリアする関数
  const clearSelection = () => {
    setHoveredTask(null);
    setHoveredCalendarTaskId(null);
    setHoveredCalendarDate(null);
  };

  const value: UIStateContextValue = {
    hoveredTask,
    hoveredCalendarTaskId,
    hoveredCalendarDate,
    setHoveredTask,
    setHoveredCalendarTaskId,
    setHoveredCalendarDate,
    clearSelection
  };

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
};