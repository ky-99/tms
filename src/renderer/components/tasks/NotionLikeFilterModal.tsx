import React, { useState, useRef, useEffect } from 'react';
import { TaskStatus, TaskPriority, Tag } from '../../types';

interface NotionLikeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  
  // Filter state
  selectedStatuses: TaskStatus[];
  onStatusChange: (statuses: TaskStatus[]) => void;
  selectedPriorities: TaskPriority[];
  onPriorityChange: (priorities: TaskPriority[]) => void;
  selectedTagIds: number[];
  onTagChange: (tagIds: number[]) => void;
  allTags: Tag[];
  dateFilterFrom: string;
  dateFilterTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  includeParentTasks: boolean;
  onIncludeParentTasksChange: (include: boolean) => void;
  maintainHierarchy: boolean;
  onMaintainHierarchyChange: (maintain: boolean) => void;
  onClearFilters: () => void;
}

const NotionLikeFilterModal: React.FC<NotionLikeFilterModalProps> = ({
  isOpen,
  onClose,
  triggerRef,
  selectedStatuses,
  onStatusChange,
  selectedPriorities,
  onPriorityChange,
  selectedTagIds,
  onTagChange,
  allTags,
  dateFilterFrom,
  dateFilterTo,
  onDateFromChange,
  onDateToChange,
  includeParentTasks,
  onIncludeParentTasksChange,
  maintainHierarchy,
  onMaintainHierarchyChange,
  onClearFilters,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [expandedSections, setExpandedSections] = useState({
    status: false,
    priority: false,
    tags: false,
    dates: false,
    options: false,
  });

  const statusOptions = [
    { value: 'pending' as TaskStatus, label: '未着手', color: '#6b7280' },
    { value: 'in_progress' as TaskStatus, label: '進行中', color: '#3b82f6' },
    { value: 'completed' as TaskStatus, label: '完了', color: '#10b981' },
  ];

  const priorityOptions = [
    { value: 'low' as TaskPriority, label: '低', color: '#6b7280' },
    { value: 'medium' as TaskPriority, label: '中', color: '#3b82f6' },
    { value: 'high' as TaskPriority, label: '高', color: '#f59e0b' },
    { value: 'urgent' as TaskPriority, label: '緊急', color: '#ef4444' },
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

      const modalWidth = 460;
      const modalHeight = 500;
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

  // Click outside to close and disable background interactions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Disable background scroll and interactions
      document.body.style.overflow = 'hidden';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      // Re-enable pointer events for the modal
      if (modalRef.current) {
        modalRef.current.style.pointerEvents = 'auto';
      }
      
      // Prevent keyboard scrolling
      const preventScroll = (e: KeyboardEvent) => {
        const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
        if (scrollKeys.includes(e.code)) {
          e.preventDefault();
        }
      };
      
      // Prevent wheel scrolling
      const preventWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        const isInModal = modalRef.current?.contains(target);
        
        if (!isInModal) {
          e.preventDefault();
        } else {
          // Always prevent background scroll when inside modal
          e.preventDefault();
          
          // Check if the modal content can scroll and handle it manually
          const modalContent = modalRef.current?.querySelector('.notion-filter-content') as HTMLElement;
          if (modalContent) {
            const isScrollable = modalContent.scrollHeight > modalContent.clientHeight;
            
            if (isScrollable) {
              // Let the modal handle the scroll
              modalContent.scrollTop += e.deltaY;
            }
            // If not scrollable, just prevent the scroll (don't pass to background)
          }
        }
      };
      
      // Prevent touch scrolling
      const preventTouch = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const isInModal = modalRef.current?.contains(target);
        
        if (!isInModal) {
          e.preventDefault();
        } else {
          // Check if the modal content can scroll
          const modalContent = modalRef.current?.querySelector('.notion-filter-content') as HTMLElement;
          if (modalContent) {
            const isScrollable = modalContent.scrollHeight > modalContent.clientHeight;
            
            if (!isScrollable) {
              // If modal is not scrollable, prevent touch scroll
              e.preventDefault();
            }
            // If scrollable, let the modal handle it naturally
          }
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', preventScroll);
      document.addEventListener('wheel', preventWheel, { passive: false });
      document.addEventListener('touchmove', preventTouch, { passive: false });
      
      return () => {
        // Restore background interactions
        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
        
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', preventScroll);
        document.removeEventListener('wheel', preventWheel);
        document.removeEventListener('touchmove', preventTouch);
      };
    }
  }, [isOpen, onClose]);

  // Handle status toggle
  const handleStatusToggle = (status: TaskStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    onStatusChange(newStatuses);
  };

  // Handle priority toggle
  const handlePriorityToggle = (priority: TaskPriority) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority];
    onPriorityChange(newPriorities);
  };

  // Handle tag toggle
  const handleTagToggle = (tagId: number) => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagChange(newTagIds);
  };


  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get section counts
  const getSectionCount = (section: string) => {
    switch (section) {
      case 'status':
        return selectedStatuses.length;
      case 'priority':
        return selectedPriorities.length;
      case 'tags':
        return selectedTagIds.length;
      case 'dates':
        return (dateFilterFrom || dateFilterTo) ? 1 : 0;
      case 'options':
        return (includeParentTasks ? 0 : 1) + (maintainHierarchy ? 1 : 0);
      default:
        return 0;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background overlay to block interactions */}
      {isOpen && (
        <div
          className="notion-filter-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 999,
            backgroundColor: 'transparent',
            cursor: 'default',
          }}
        />
      )}
      
      <div
        ref={modalRef}
        className="notion-filter-modal"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          pointerEvents: 'auto',
          maxHeight: `${Math.min(500, window.innerHeight - position.top - 20)}px`,
        }}
      >
      <div className="notion-filter-content">
        {/* Header */}
        <div className="notion-filter-header">
          <span className="notion-filter-title">フィルター</span>
          <button
            onClick={onClearFilters}
            className="notion-filter-clear"
            disabled={
              selectedStatuses.length === 0 &&
              selectedPriorities.length === 0 &&
              selectedTagIds.length === 0 &&
              !dateFilterFrom &&
              !dateFilterTo &&
              includeParentTasks === true &&
              maintainHierarchy === false
            }
          >
            クリア
          </button>
        </div>

        {/* Status Filter */}
        <div className="notion-filter-section">
          <button
            className="notion-filter-section-header"
            onClick={() => toggleSection('status')}
          >
            <div className="notion-filter-section-title">ステータス</div>
            <div className="notion-filter-section-controls">
              {getSectionCount('status') > 0 && (
                <span className="notion-filter-count">{getSectionCount('status')}</span>
              )}
              <svg
                className={`notion-filter-chevron ${expandedSections.status ? 'expanded' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" fill="currentColor"/>
              </svg>
            </div>
          </button>
          {expandedSections.status && (
            <div className="notion-filter-options">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleStatusToggle(option.value)}
                  className={`notion-filter-option ${
                    selectedStatuses.includes(option.value) ? 'selected' : ''
                  }`}
                >
                  <div
                    className="notion-filter-option-color"
                    style={{ backgroundColor: option.color }}
                  />
                  <span>{option.label}</span>
                  {selectedStatuses.includes(option.value) && (
                    <svg className="notion-filter-check" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Filter */}
        <div className="notion-filter-section">
          <button
            className="notion-filter-section-header"
            onClick={() => toggleSection('priority')}
          >
            <div className="notion-filter-section-title">優先度</div>
            <div className="notion-filter-section-controls">
              {getSectionCount('priority') > 0 && (
                <span className="notion-filter-count">{getSectionCount('priority')}</span>
              )}
              <svg
                className={`notion-filter-chevron ${expandedSections.priority ? 'expanded' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" fill="currentColor"/>
              </svg>
            </div>
          </button>
          {expandedSections.priority && (
            <div className="notion-filter-options">
              {priorityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handlePriorityToggle(option.value)}
                  className={`notion-filter-option ${
                    selectedPriorities.includes(option.value) ? 'selected' : ''
                  }`}
                >
                  <div
                    className="notion-filter-option-color"
                    style={{ backgroundColor: option.color }}
                  />
                  <span>{option.label}</span>
                  {selectedPriorities.includes(option.value) && (
                    <svg className="notion-filter-check" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="notion-filter-section">
            <button
              className="notion-filter-section-header"
              onClick={() => toggleSection('tags')}
            >
              <div className="notion-filter-section-title">タグ</div>
              <div className="notion-filter-section-controls">
                {getSectionCount('tags') > 0 && (
                  <span className="notion-filter-count">{getSectionCount('tags')}</span>
                )}
                <svg
                  className={`notion-filter-chevron ${expandedSections.tags ? 'expanded' : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" fill="currentColor"/>
                </svg>
              </div>
            </button>
            {expandedSections.tags && (
              <div className="notion-filter-options">
                {allTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`notion-filter-option ${
                      selectedTagIds.includes(tag.id) ? 'selected' : ''
                    }`}
                  >
                    <div
                      className="notion-filter-option-color"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && (
                      <svg className="notion-filter-check" width="16" height="16" viewBox="0 0 16 16">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Date Filter */}
        <div className="notion-filter-section">
          <button
            className="notion-filter-section-header"
            onClick={() => toggleSection('dates')}
          >
            <div className="notion-filter-section-title">期限</div>
            <div className="notion-filter-section-controls">
              {getSectionCount('dates') > 0 && (
                <span className="notion-filter-count">{getSectionCount('dates')}</span>
              )}
              <svg
                className={`notion-filter-chevron ${expandedSections.dates ? 'expanded' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" fill="currentColor"/>
              </svg>
            </div>
          </button>
          {expandedSections.dates && (
            <div className="notion-filter-date-inputs">
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="notion-filter-date-input"
                placeholder="開始日"
              />
              <span className="notion-filter-date-separator">〜</span>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="notion-filter-date-input"
                placeholder="終了日"
              />
            </div>
          )}
        </div>

        {/* Options Filter */}
        <div className="notion-filter-section">
          <button
            className="notion-filter-section-header"
            onClick={() => toggleSection('options')}
          >
            <div className="notion-filter-section-title">オプション</div>
            <div className="notion-filter-section-controls">
              <svg
                className={`notion-filter-chevron ${expandedSections.options ? 'expanded' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" fill="currentColor"/>
              </svg>
            </div>
          </button>
          {expandedSections.options && (
            <div className="notion-filter-options">
              <div className="notion-filter-toggle-option">
                <span className="notion-filter-toggle-label">親タスクを含める</span>
                <button
                  className={`notion-filter-toggle ${includeParentTasks ? 'active' : ''}`}
                  onClick={() => onIncludeParentTasksChange(!includeParentTasks)}
                >
                  <div className="notion-filter-toggle-slider">
                    <div className="notion-filter-toggle-thumb"></div>
                  </div>
                </button>
              </div>
              <div className="notion-filter-toggle-option">
                <span className="notion-filter-toggle-label">階層構造を維持</span>
                <button
                  className={`notion-filter-toggle ${maintainHierarchy ? 'active' : ''}`}
                  onClick={() => onMaintainHierarchyChange(!maintainHierarchy)}
                >
                  <div className="notion-filter-toggle-slider">
                    <div className="notion-filter-toggle-thumb"></div>
                  </div>
                </button>
              </div>
              <div className="notion-filter-option-description">
                階層構造を維持すると、条件に一致する子タスクがある場合に親タスクも含めて表示されます
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default NotionLikeFilterModal;