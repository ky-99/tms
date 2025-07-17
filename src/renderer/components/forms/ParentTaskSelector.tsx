import React, { useState, useRef } from 'react';

interface ParentTaskSelectorProps {
  availableTasks: { id: number; title: string; depth: number }[];
  selectedParentId?: number;
  onParentSelect: (parentId?: number) => void;
}

const ParentTaskSelector: React.FC<ParentTaskSelectorProps> = ({ 
  availableTasks, 
  selectedParentId, 
  onParentSelect 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // 外側をクリックしたときに閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [isOpen]);

  const filteredTasks = availableTasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTask = availableTasks.find(task => task.id === selectedParentId);

  return (
    <div className="parent-task-selector" ref={selectorRef}>
      <div 
        className="parent-task-selector-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="parent-task-selector-value">
          {selectedTask ? selectedTask.title : 'なし（ルートタスク）'}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="parent-task-selector-arrow">
          <path d={isOpen ? "M7 14l5-5 5 5z" : "M7 10l5 5 5-5z"}/>
        </svg>
      </div>
      
      {isOpen && (
        <div className="parent-task-selector-dropdown">
          <div className="parent-task-selector-search">
            <input
              type="text"
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="parent-task-selector-search-input"
              autoFocus
            />
          </div>
          
          <div className="parent-task-selector-options">
            <div
              className={`parent-task-selector-option ${!selectedParentId ? 'selected' : ''}`}
              onClick={() => {
                onParentSelect(undefined);
                setIsOpen(false);
                setSearchQuery('');
              }}
              onMouseEnter={() => setHoveredId(null)}
            >
              なし（ルートタスク）
            </div>
            
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`parent-task-selector-option ${
                  task.id === selectedParentId ? 'selected' : ''
                } ${task.id === hoveredId ? 'hovered' : ''}`}
                style={{ paddingLeft: `${16 + task.depth * 20}px` }}
                onClick={() => {
                  onParentSelect(task.id);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                onMouseEnter={() => setHoveredId(task.id)}
              >
                {task.title}
              </div>
            ))}
            
            {filteredTasks.length === 0 && searchQuery && (
              <div className="parent-task-selector-no-results">
                該当するタスクがありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentTaskSelector;