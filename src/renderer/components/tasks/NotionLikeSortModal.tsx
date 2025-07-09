import React, { useState, useRef, useEffect } from 'react';

export type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

interface NotionLikeSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  currentSort: SortOption[];
  onSortChange: (sortOptions: SortOption[]) => void;
  onClearSort: () => void;
}

const NotionLikeSortModal: React.FC<NotionLikeSortModalProps> = ({
  isOpen,
  onClose,
  triggerRef,
  currentSort,
  onSortChange,
  onClearSort,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const sortOptions = [
    { field: 'status' as SortField, label: 'ステータス' },
    { field: 'priority' as SortField, label: '優先度' },
    { field: 'dueDate' as SortField, label: '期限' },
    { field: 'createdAt' as SortField, label: '作成日' },
  ];

  // Position calculation
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const scrollX = window.scrollX || 0;
      const scrollY = window.scrollY || 0;

      const modalWidth = 260;
      const modalHeight = 300;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + scrollY + 8;
      let left = rect.left + scrollX;

      // Adjust if modal would go off screen
      if (left + modalWidth > viewportWidth) {
        left = rect.right + scrollX - modalWidth;
      }

      if (top + modalHeight > viewportHeight + scrollY) {
        top = rect.top + scrollY - modalHeight - 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, triggerRef]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleSortToggle = (field: SortField) => {
    const existingSortIndex = currentSort.findIndex(sort => sort.field === field);
    
    if (existingSortIndex >= 0) {
      const currentDirection = currentSort[existingSortIndex].direction;
      const newSort = [...currentSort];
      
      if (currentDirection === 'asc') {
        // Change to desc
        newSort[existingSortIndex] = { field, direction: 'desc' };
      } else {
        // Remove sort
        newSort.splice(existingSortIndex, 1);
      }
      
      onSortChange(newSort);
    } else {
      // Add new sort (asc by default)
      onSortChange([...currentSort, { field, direction: 'asc' }]);
    }
  };

  const getSortState = (field: SortField): { active: boolean; direction?: SortDirection; index?: number } => {
    const sortIndex = currentSort.findIndex(sort => sort.field === field);
    if (sortIndex >= 0) {
      return {
        active: true,
        direction: currentSort[sortIndex].direction,
        index: sortIndex + 1,
      };
    }
    return { active: false };
  };

  const getSortIcon = (field: SortField) => {
    const sortState = getSortState(field);
    
    if (!sortState.active) {
      return null;
    }

    if (sortState.direction === 'asc') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14l5-5 5 5z"/>
        </svg>
      );
    }

    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z"/>
      </svg>
    );
  };

  const getSortLabel = (field: SortField) => {
    const sortState = getSortState(field);
    
    if (!sortState.active) {
      return null;
    }

    return sortState.direction === 'asc' ? '昇順' : '降順';
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="notion-sort-modal"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      <div className="notion-sort-content">
        {/* Header */}
        <div className="notion-sort-header">
          <span className="notion-sort-title">ソート</span>
          <button
            onClick={onClearSort}
            className="notion-sort-clear"
            disabled={currentSort.length === 0}
          >
            クリア
          </button>
        </div>

        {/* Sort Options */}
        <div className="notion-sort-options">
          {sortOptions.map(option => {
            const sortState = getSortState(option.field);
            return (
              <button
                key={option.field}
                onClick={() => handleSortToggle(option.field)}
                className={`notion-sort-option ${sortState.active ? 'active' : ''}`}
              >
                <span className="notion-sort-option-label">{option.label}</span>
                <div className="notion-sort-option-controls">
                  {sortState.active && (
                    <>
                      {sortState.index && (
                        <span className="notion-sort-index">{sortState.index}</span>
                      )}
                      <span className="notion-sort-direction">{getSortLabel(option.field)}</span>
                      {getSortIcon(option.field)}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="notion-sort-instructions">
          <p>クリックして昇順でソート</p>
          <p>再度クリックで降順、3回目で解除</p>
          <p>複数フィールドでソート可能</p>
        </div>
      </div>
    </div>
  );
};

export default NotionLikeSortModal;