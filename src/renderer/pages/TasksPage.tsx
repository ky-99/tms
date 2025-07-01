/**
 * TasksPage - Refactored with new state management
 * Displays tasks with filtering and management capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, Tag, TaskStatus, TaskPriority } from '../types';
import { useTaskContext, useErrorContext } from '../contexts';
import { useLocalStorage, useDebounce } from '../hooks';
import { flattenTasks, filterTasks } from '../utils/taskUtils';
import { Button, LoadingSpinner, TextInput, Modal } from '../components/ui';
import { TaskFiltersModal } from '../components/tasks/TaskFiltersModal';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import TaskItem from '../components/TaskItem';

const TasksPage: React.FC = () => {
  const { 
    tasks, 
    tags,
    loading, 
    error, 
    loadTasks,
    deleteTask,
    expandedTasks,
    toggleTaskExpansion,
    setExpandedTasks
  } = useTaskContext();
  const { showError, showSuccess, clearError } = useErrorContext();
  
  const { rootId } = useParams<{ rootId?: string }>();
  const navigate = useNavigate();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentTaskId, setParentTaskId] = useState<number | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter state with localStorage persistence
  const [searchQuery, setSearchQuery] = useLocalStorage('taskSearch', '');
  const [selectedTagIds, setSelectedTagIds] = useLocalStorage<number[]>('selectedTags', []);
  const [selectedStatuses, setSelectedStatuses] = useLocalStorage<TaskStatus[]>('selectedStatuses', []);
  const [selectedPriorities, setSelectedPriorities] = useLocalStorage<TaskPriority[]>('selectedPriorities', []);
  const [dateFilterFrom, setDateFilterFrom] = useLocalStorage('dateFilterFrom', '');
  const [dateFilterTo, setDateFilterTo] = useLocalStorage('dateFilterTo', '');
  
  // UI state
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [expandedSections, setExpandedSections] = useLocalStorage('expandedFilterSections', {
    status: false,
    priority: false,
    tags: false,
    dates: false
  });

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Get tasks for current view
  const currentTasks = useMemo(() => {
    if (!rootId) return tasks;
    
    const targetId = parseInt(rootId);
    const findTask = (taskList: Task[]): Task | null => {
      for (const task of taskList) {
        if (task.id === targetId) return task;
        if (task.children) {
          const found = findTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const targetTask = findTask(tasks);
    return targetTask?.children || [];
  }, [tasks, rootId]);

  // Get the current target task for leaf node display
  const currentTargetTask = useMemo(() => {
    if (!rootId) return null;
    
    const targetId = parseInt(rootId);
    const findTask = (taskList: Task[]): Task | null => {
      for (const task of taskList) {
        if (task.id === targetId) return task;
        if (task.children) {
          const found = findTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findTask(tasks);
  }, [tasks, rootId]);

  // Check if current task is a leaf node (no children)
  const isLeafNode = currentTargetTask && (!currentTargetTask.children || currentTargetTask.children.length === 0);

  // Apply filters to all tasks under current position (including all descendants)
  const filteredTasks = useMemo(() => {
    if (!currentTasks.length) return [];
    
    // If no filters are applied, return the original tree structure
    const hasFilters = debouncedSearch.trim() !== '' || 
                      selectedStatuses.length > 0 || 
                      selectedPriorities.length > 0 ||
                      selectedTagIds.length > 0 ||
                      dateFilterFrom !== '' ||
                      dateFilterTo !== '';
    
    if (!hasFilters) {
      return currentTasks;
    }
    
    // Flatten all tasks from current position downward to include all descendants
    const allDescendantTasks = flattenTasks(currentTasks);
    
    // Apply filters to the flattened list
    const matchingTasks = allDescendantTasks.filter(task => {
      // Search filter
      if (debouncedSearch.trim() !== '') {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(searchLower) ||
          (task.description && task.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
        return false;
      }
      
      // Priority filter
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
        return false;
      }
      
      // Tag filter (if implemented)
      if (selectedTagIds.length > 0) {
        const hasMatchingTag = task.tagIds && task.tagIds.some(tagId => selectedTagIds.includes(tagId));
        if (!hasMatchingTag) return false;
      }
      
      // Date filter (if implemented)
      if (dateFilterFrom || dateFilterTo) {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        if (dateFilterFrom && taskDate < new Date(dateFilterFrom)) return false;
        if (dateFilterTo && taskDate > new Date(dateFilterTo)) return false;
      }
      
      return true;
    });
    
    // Convert matching tasks back to a flat list with parent information preserved
    return matchingTasks.map(task => {
      // Check if this task originally had children (is a parent task)
      const originalTask = allDescendantTasks.find(t => t.id === task.id);
      const hadChildren = originalTask && originalTask.children && originalTask.children.length > 0;
      
      return {
        ...task,
        children: [], // Remove children to show as flat list
        expanded: false,
        isParentInFilter: hadChildren // Flag to indicate this was originally a parent
      };
    });
  }, [currentTasks, debouncedSearch, selectedStatuses, selectedPriorities, selectedTagIds, dateFilterFrom, dateFilterTo]);

  // Apply expansion state
  const displayedTasks = useMemo(() => {
    const applyExpansion = (taskList: Task[]): Task[] => {
      return taskList.map(task => ({
        ...task,
        expanded: expandedTasks.has(task.id),
        children: task.children ? applyExpansion(task.children) : undefined
      }));
    };
    
    return applyExpansion(filteredTasks);
  }, [filteredTasks, expandedTasks]);


  // Get breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!rootId) return [];
    
    const targetId = parseInt(rootId);
    const path: Task[] = [];
    
    const findPath = (taskList: Task[], currentPath: Task[]): boolean => {
      for (const task of taskList) {
        const newPath = [...currentPath, task];
        if (task.id === targetId) {
          path.push(...newPath);
          return true;
        }
        if (task.children && findPath(task.children, newPath)) {
          return true;
        }
      }
      return false;
    };
    
    findPath(tasks, []);
    return path;
  }, [tasks, rootId]);

  // Clear error when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // Modal handlers
  const openCreateModal = (parentId?: number) => {
    setParentTaskId(parentId);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setParentTaskId(undefined);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setParentTaskId(undefined);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedStatuses.length > 0 ||
      selectedPriorities.length > 0 ||
      selectedTagIds.length > 0 ||
      dateFilterFrom !== '' ||
      dateFilterTo !== ''
    );
  }, [searchQuery, selectedStatuses, selectedPriorities, selectedTagIds, dateFilterFrom, dateFilterTo]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedPriorities.length > 0) count++;
    if (selectedTagIds.length > 0) count++;
    if (dateFilterFrom || dateFilterTo) count++;
    return count;
  }, [searchQuery, selectedStatuses, selectedPriorities, selectedTagIds, dateFilterFrom, dateFilterTo]);

  // Filter handlers
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTagIds([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setDateFilterFrom('');
    setDateFilterTo('');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Navigate to task
  const handleTaskClick = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      // Actually delete the task using TaskContext
      await deleteTask(taskId);
      
      // Show success message
      showSuccess('タスクを削除しました');
      
      // Handle navigation after successful deletion
      if (displayedTasks.length === 1 && displayedTasks[0].id === taskId) {
        // If this was the last task, navigate back
        navigate('/tasks');
      }
    } catch (error) {
      showError('タスクの削除に失敗しました', error instanceof Error ? error.message : '');
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="lg" text="タスクを読み込み中..." />
      </div>
    );
  }

  return (
    <div className="tasks-page">
      {/* Search and Filter Controls */}
      <div className="search-filter-container">
        <div className="search-input-wrapper">
          <TextInput
            type="search"
            placeholder="タスクを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={`search-filter-icon ${hasActiveFilters ? 'has-filters' : ''} ${showTagFilter ? 'active' : ''}`}
            onClick={() => setShowTagFilter(!showTagFilter)}
            title={hasActiveFilters ? "フィルター適用中" : "フィルター"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            {hasActiveFilters && (
              <span className="filter-badge">!</span>
            )}
          </button>
        </div>
        
        <button
          className="create-task-icon"
          onClick={() => openCreateModal(rootId ? parseInt(rootId) : undefined)}
          title="タスクを作成"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      {/* Filter Modal */}
      {showTagFilter && (
        <Modal
          isOpen={showTagFilter}
          onClose={() => setShowTagFilter(false)}
          showCloseButton={false}
          className="filter-modal"
        >
          <TaskFiltersModal
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatuses={selectedStatuses}
            onStatusChange={setSelectedStatuses}
            selectedPriorities={selectedPriorities}
            onPriorityChange={setSelectedPriorities}
            selectedTagIds={selectedTagIds}
            onTagChange={setSelectedTagIds}
            allTags={tags}
            dateFilterFrom={dateFilterFrom}
            dateFilterTo={dateFilterTo}
            onDateFromChange={setDateFilterFrom}
            onDateToChange={setDateFilterTo}
            onClose={() => setShowTagFilter(false)}
            onClearFilters={handleClearFilters}
          />
        </Modal>
      )}

      {/* Breadcrumb */}
      {breadcrumbPath.length > 0 && (
        <nav className="breadcrumb">
          <ol>
            <li>
              <button
                onClick={() => navigate('/tasks')}
                className="breadcrumb-link"
              >
                ホーム
              </button>
            </li>
            {breadcrumbPath.map((task, index) => (
              <li key={task.id}>
                <span className="breadcrumb-separator">/</span>
                {index === breadcrumbPath.length - 1 ? (
                  <span className="breadcrumb-current">{task.title}</span>
                ) : (
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="breadcrumb-link"
                  >
                    {task.title}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Task List */}
      <div className="task-list-container">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {isLeafNode && currentTargetTask ? (
          <div className="task-detail-view">
            <TaskItem
              task={currentTargetTask}
              level={0}
              onTasksChange={loadTasks}
              onAddSubTask={openCreateModal}
              onTaskClick={handleTaskClick}
              onEditTask={openEditModal}
              onDeleteTask={handleDeleteTask}
              onToggleExpand={toggleTaskExpansion}
            />
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-message">
              {searchQuery || selectedStatuses.length > 0 || selectedPriorities.length > 0
                ? 'フィルター条件に一致するタスクがありません'
                : 'タスクがありません'}
            </p>
            {rootId && displayedTasks.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => navigate('/tasks')}
              >
                タスクホームに戻る
              </Button>
            )}
          </div>
        ) : (
          <TaskList
            tasks={displayedTasks}
            onTasksChange={loadTasks}
            onAddSubTask={openCreateModal}
            onTaskClick={handleTaskClick}
            onEditTask={openEditModal}
            onDeleteTask={handleDeleteTask}
            onToggleExpand={toggleTaskExpansion}
          />
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        defaultParentId={parentTaskId}
        editingTask={editingTask}
      />
    </div>
  );
};

export default TasksPage;