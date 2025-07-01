/**
 * Task Filters component
 * Handles search and filtering functionality for tasks
 */

import React from 'react';
import { TextInput, Select, Button } from '../ui';
import { TaskStatus, TaskPriority, Tag } from '../../types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants';

interface TaskFiltersProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Status filter
  selectedStatuses: TaskStatus[];
  onStatusChange: (statuses: TaskStatus[]) => void;
  
  // Priority filter
  selectedPriorities: TaskPriority[];
  onPriorityChange: (priorities: TaskPriority[]) => void;
  
  // Tag filter
  selectedTagIds: number[];
  onTagChange: (tagIds: number[]) => void;
  allTags: Tag[];
  
  // Date filter
  dateFilterFrom: string;
  dateFilterTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  
  // Expanded sections
  expandedSections: {[key: string]: boolean};
  onToggleSection: (section: 'status' | 'priority' | 'tags' | 'dates') => void;
  
  // Clear filters
  onClearFilters: () => void;
  
  // UI options
  hideSearch?: boolean;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  onSearchChange,
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
  expandedSections,
  onToggleSection,
  onClearFilters,
  hideSearch = false
}) => {
  const hasActiveFilters = searchQuery.trim() || 
    selectedStatuses.length > 0 || 
    selectedPriorities.length > 0 || 
    selectedTagIds.length > 0 || 
    dateFilterFrom || 
    dateFilterTo;
    
  const statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value,
    label
  }));
  
  const priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label
  }));
  
  const tagOptions = allTags.map(tag => ({
    value: tag.id.toString(),
    label: tag.name
  }));

  return (
    <div className="filter-container">
      {/* Search */}
      {!hideSearch && (
        <div className="search-section">
          <TextInput
            type="search"
            placeholder="タスクを検索..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      
      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="filter-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
          >
            フィルターをクリア
          </Button>
        </div>
      )}
      
      {/* Status Filter */}
      <div>
        <button
          className="filter-section-header"
          onClick={() => onToggleSection('status')}
        >
          ステータス
          <span className={`filter-section-arrow ${expandedSections.status ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        
        {expandedSections.status && (
          <div className="filter-section-content">
            {statusOptions.map(option => (
              <label key={option.value} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(option.value as TaskStatus)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onStatusChange([...selectedStatuses, option.value as TaskStatus]);
                    } else {
                      onStatusChange(selectedStatuses.filter(s => s !== option.value));
                    }
                  }}
                  className="filter-checkbox"
                />
                <span className="filter-option-label">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Priority Filter */}
      <div>
        <button
          className="filter-section-header"
          onClick={() => onToggleSection('priority')}
        >
          優先度
          <span className={`filter-section-arrow ${expandedSections.priority ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        
        {expandedSections.priority && (
          <div className="filter-section-content">
            {priorityOptions.map(option => (
              <label key={option.value} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedPriorities.includes(option.value as TaskPriority)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onPriorityChange([...selectedPriorities, option.value as TaskPriority]);
                    } else {
                      onPriorityChange(selectedPriorities.filter(p => p !== option.value));
                    }
                  }}
                  className="filter-checkbox"
                />
                <span className="filter-option-label">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Tag Filter */}
      <div>
        <button
          className="filter-section-header"
          onClick={() => onToggleSection('tags')}
        >
          タグ
          <span className={`filter-section-arrow ${expandedSections.tags ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        
        {expandedSections.tags && (
          <div className="filter-section-content">
            {tagOptions.map(option => (
              <label key={option.value} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(parseInt(option.value))}
                  onChange={(e) => {
                    const tagId = parseInt(option.value);
                    if (e.target.checked) {
                      onTagChange([...selectedTagIds, tagId]);
                    } else {
                      onTagChange(selectedTagIds.filter(id => id !== tagId));
                    }
                  }}
                  className="filter-checkbox"
                />
                <span className="filter-option-label">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Date Range Filter */}
      <div>
        <button
          className="filter-section-header"
          onClick={() => onToggleSection('dates')}
        >
          期限日
          <span className={`filter-section-arrow ${expandedSections.dates ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        
        {expandedSections.dates && (
          <div className="filter-section-content">
            <TextInput
              type="date"
              label="開始日"
              value={dateFilterFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
            <TextInput
              type="date"
              label="終了日"
              value={dateFilterTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};