import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';

interface ParentTaskSelectorProps {
  tasks: Task[];
  currentTask: Task;
  selectedParentId: number | null;
  onParentChange: (parentId: number | null) => void;
  isCreating: boolean;
}

export const ParentTaskSelector: React.FC<ParentTaskSelectorProps> = ({
  tasks,
  currentTask,
  selectedParentId,
  onParentChange,
  isCreating
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 平坦化されたタスクリストを作成
  const flattenTasks = (tasks: Task[], depth = 0): Array<Task & { depth: number }> => {
    const result: Array<Task & { depth: number }> = [];
    
    for (const task of tasks) {
      // 現在のタスクとその子孫タスクは除外
      if (task.id === currentTask.id) continue;
      
      const isDescendant = (parentTask: Task, targetTaskId: number): boolean => {
        if (parentTask.id === targetTaskId) return true;
        return parentTask.children?.some(child => isDescendant(child, targetTaskId)) || false;
      };
      
      if (!isCreating && isDescendant(currentTask, task.id)) continue;
      
      result.push({ ...task, depth });
      if (task.children) {
        result.push(...flattenTasks(task.children, depth + 1));
      }
    }
    
    return result;
  };

  const flattenedTasks = flattenTasks(tasks);
  const selectedParent = flattenedTasks.find(t => t.id === selectedParentId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="parent-task-selector" ref={dropdownRef}>
      <label>親タスク:</label>
      <div className="parent-task-dropdown">
        <button 
          className="parent-task-selected"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          {selectedParent ? (
            <span className="parent-task-title">
              {'　'.repeat(selectedParent.depth)}{selectedParent.title}
            </span>
          ) : (
            <span className="parent-task-none">なし</span>
          )}
          <span className="dropdown-arrow">▼</span>
        </button>
        
        {isOpen && (
          <div className="parent-task-options">
            <div
              className="parent-task-option"
              onClick={() => {
                onParentChange(null);
                setIsOpen(false);
              }}
            >
              <span className="parent-task-none">なし</span>
            </div>
            {flattenedTasks.map(task => (
              <div
                key={task.id}
                className={`parent-task-option ${task.id === selectedParentId ? 'selected' : ''}`}
                onClick={() => {
                  onParentChange(task.id);
                  setIsOpen(false);
                }}
              >
                <span className="parent-task-title">
                  {'　'.repeat(task.depth)}{task.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};