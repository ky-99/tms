/**
 * Enhanced Task Filters Modal
 * Modern, tab-based filter interface for tasks
 */

import React, { useState } from 'react';
import { TextInput, Button } from '../ui';
import { TaskStatus, TaskPriority, Tag } from '../../types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../constants';

interface TaskFiltersModalProps {
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
  
  // Clear filters
  onClearFilters: () => void;
}

export const TaskFiltersModal: React.FC<TaskFiltersModalProps & { onClose?: () => void }> = ({
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
  onClearFilters,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'priority' | 'tags' | 'dates'>('status');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  
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
  
  const tagOptions = allTags
    .filter(tag => 
      tagSearchQuery.trim() === '' || 
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
    )
    .map(tag => ({
      value: tag.id.toString(),
      label: tag.name,
      color: tag.color
    }));


  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'status': return selectedStatuses.length;
      case 'priority': return selectedPriorities.length;
      case 'tags': return selectedTagIds.length;
      case 'dates': return (dateFilterFrom || dateFilterTo) ? 1 : 0;
      default: return 0;
    }
  };

  return (
    <div className="filters-modal">
      {/* Header with close button and clear button */}
      <div className="filters-modal-header">
        {onClose && (
          <button
            className="filters-modal-close"
            onClick={onClose}
            title="閉じる"
          >
            ×
          </button>
        )}
        {hasActiveFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            className="clear-filters-btn"
          >
            すべてクリア
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <span className="tab-label">ステータス</span>
          {getTabCount('status') > 0 && (
            <span className="tab-badge">{getTabCount('status')}</span>
          )}
        </button>
        
        <button
          className={`filter-tab ${activeTab === 'priority' ? 'active' : ''}`}
          onClick={() => setActiveTab('priority')}
        >
          <span className="tab-label">優先度</span>
          {getTabCount('priority') > 0 && (
            <span className="tab-badge">{getTabCount('priority')}</span>
          )}
        </button>
        
        <button
          className={`filter-tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tags');
            if (activeTab !== 'tags') {
              setTagSearchQuery(''); // タブ切り替え時に検索をクリア
            }
          }}
        >
          <span className="tab-label">タグ</span>
          {getTabCount('tags') > 0 && (
            <span className="tab-badge">{getTabCount('tags')}</span>
          )}
        </button>
        
        <button
          className={`filter-tab ${activeTab === 'dates' ? 'active' : ''}`}
          onClick={() => setActiveTab('dates')}
        >
          <span className="tab-label">期限</span>
          {getTabCount('dates') > 0 && (
            <span className="tab-badge">{getTabCount('dates')}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="filter-content">
        {activeTab === 'status' && (
          <div className="filter-panel">
            <div className="filter-options">
              {statusOptions.map(option => (
                <label 
                  key={option.value} 
                  className={`filter-option-card ${
                    selectedStatuses.includes(option.value as TaskStatus) ? 'selected' : ''
                  }`}
                  data-status={option.value}
                >
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
                    className="filter-checkbox-hidden"
                  />
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    <span className="option-check">✓</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'priority' && (
          <div className="filter-panel">
            <div className="filter-options">
              {priorityOptions.map(option => (
                <label 
                  key={option.value} 
                  className={`filter-option-card ${
                    selectedPriorities.includes(option.value as TaskPriority) ? 'selected' : ''
                  }`}
                  data-priority={option.value}
                >
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
                    className="filter-checkbox-hidden"
                  />
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    <span className="option-check">✓</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="filter-panel">
            
            {/* Tag Search */}
            <div className="tag-search-container">
              <TextInput
                type="search"
                placeholder="タグを検索..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="tag-search-input"
              />
              {tagSearchQuery && (
                <button
                  className="tag-search-clear"
                  onClick={() => setTagSearchQuery('')}
                  title="検索をクリア"
                >
                  ×
                </button>
              )}
            </div>
            
            <div className="filter-options">
              {tagOptions.length === 0 ? (
                <div className="no-tags-message">
                  {tagSearchQuery ? '検索に一致するタグがありません' : 'タグがありません'}
                </div>
              ) : (
                tagOptions.map(option => (
                  <label 
                    key={option.value} 
                    className={`filter-option-card ${
                      selectedTagIds.includes(parseInt(option.value)) ? 'selected' : ''
                    }`}
                  >
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
                      className="filter-checkbox-hidden"
                    />
                    <div className="option-content">
                      <span 
                        className="option-tag-color"
                        style={{ backgroundColor: option.color }}
                      ></span>
                      <span className="option-label">{option.label}</span>
                      <span className="option-check">✓</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'dates' && (
          <div className="filter-panel">
            <div className="date-filter-container">
              <div className="date-input-group">
                <label className="date-label">
                  開始日
                </label>
                <TextInput
                  type="date"
                  value={dateFilterFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="date-input"
                />
              </div>
              
              <div className="date-separator">
                <span>〜</span>
              </div>
              
              <div className="date-input-group">
                <label className="date-label">
                  終了日
                </label>
                <TextInput
                  type="date"
                  value={dateFilterTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};